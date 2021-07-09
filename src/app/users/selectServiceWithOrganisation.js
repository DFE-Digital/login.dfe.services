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

const renderSelectServiceWithOrganisationPage = (req, res, model) => {
  res.render('users/views/selectServiceWithOrganisation', model);
};

const get = async (req, res) => {
  // get visible service orgs for this user: checking isExternalService, hideApprover, user is approver at that org
  const serviceOrganisations = await services.getFilteredUserServicesWithOrganisation(req.user.sub);
  buildAdditionalOrgDetails(serviceOrganisations);

  const model = {
    csrfToken: req.csrfToken(),
    title: 'Edit which service?',
    serviceOrganisations,
    currentPage: 'services',
    selectedServiceOrganisation: req.session.user ? req.session.user.serviceOrganisation : null,
    validationMessages: {},
    backLink: '/my-services',
  };

  renderSelectServiceWithOrganisationPage(req, res, model);
};

const validate = (req) => {
  const selectedServiceOrganisation = req.body.selectedServiceOrganisation;
  const model = {
    currentPage: 'services',
    selectedServiceOrganisation,
    validationMessages: {},
    backLink: '/my-services',
  };

  if (model.selectedServiceOrganisation === undefined || model.selectedServiceOrganisation === null) {
    model.validationMessages.serviceOrganisation = 'Please select a service';
  }
  return model;
};

const post = async (req, res) => {
  const model = validate(req);
  const serviceOrganisations = await services.getFilteredUserServicesWithOrganisation(req.user.sub);
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

  return res.redirect(
    `/approvals/${serviceOrgDetails.Organisation.id}/users/${req.user.sub}/services/${serviceOrgDetails.Service.id}`,
  );
};

module.exports = {
  get,
  post,
};
