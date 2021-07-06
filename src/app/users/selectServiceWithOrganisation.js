'use strict';

const { services, organisation } = require('login.dfe.dao');
const { getOrgNaturalIdentifiers } = require('./utils');

const buildAdditionalOrgDetails = (serviceOrganisations) => {
  serviceOrganisations.forEach((serviceOrg) => {
    const org = serviceOrg.Organisation;
    if (org) {
      org.naturalIdentifiers = getOrgNaturalIdentifiers(org);
      org.statusName = organisation.getStatusNameById(org.Status);
    }
  });
};

const buildPageTitle = (req) => {
  if (req.query.action === 'remove') {
    return 'Remove which service?';
  }
  return 'Edit which service?';
};

const renderSelectServiceWithOrganisationPage = (req, res, model) => {
  res.render('users/views/selectOrganisationService', model);
};

const buildRedirectURL = (req, serviceOrgDetails) => {
  let redirectURL = `/approvals/${serviceOrgDetails.Organisation.id}/users/${req.user.sub}/services/${serviceOrgDetails.Service.id}`;
  if (req.query.action === 'remove') {
    redirectURL += '/remove-service';
  }
  return redirectURL;
};

const get = async (req, res) => {
  const serviceOrganisations = await services.getUserServicesWithOrganisationOnlyApprover(req.user.sub);
  buildAdditionalOrgDetails(serviceOrganisations);

  const model = {
    csrfToken: req.csrfToken(),
    title: buildPageTitle(req),
    serviceOrganisations,
    currentPage: 'services',
    selectedServiceOrganisation: req.session.user ? req.session.user.serviceOrganisation : null,
    validationMessages: {},
    backLink: '/my-services',
    action: req.query.action,
  };

  renderSelectServiceWithOrganisationPage(req, res, model);
};

const validate = (req) => {
  const selectedServiceOrganisation = req.body.selectedServiceOrganisation;
  const model = {
    title: buildPageTitle(req),
    currentPage: 'services',
    selectedServiceOrganisation,
    validationMessages: {},
    backLink: '/my-services',
    action: req.query.action,
  };

  if (model.selectedServiceOrganisation === undefined || model.selectedServiceOrganisation === null) {
    model.validationMessages.serviceOrganisation = 'Please select a service';
  }
  return model;
};

const post = async (req, res) => {
  const model = validate(req);
  const serviceOrganisations = await services.getUserServicesWithOrganisationOnlyApprover(req.user.sub);
  buildAdditionalOrgDetails(serviceOrganisations);

  // persist selected org in session
  if (req.session.user) {
    req.session.user.serviceOrganisation = model.selectedServiceOrganisation;
  }

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    model.serviceOrganisations = serviceOrganisations;
    return renderSelectServiceWithOrganisationPage(req, res, model);
  }

  const serviceOrgDetails = serviceOrganisations.find((serviceOrg) => {
    return serviceOrg.id === req.body.selectedServiceOrganisation;
  });

  return res.redirect(buildRedirectURL(req, serviceOrgDetails));
};

module.exports = {
  get,
  post,
};
