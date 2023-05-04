'use strict';

const { services, organisation } = require('login.dfe.dao');
const { getOrgNaturalIdentifiers, isRemoveService, isOrgEndUser } = require('./utils');

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
  if (isRemoveService(req)) {
    return 'Remove which service?';
  }
  return 'Which service do you want to view or edit?';
};

const renderSelectServiceWithOrganisationPage = (req, res, model) => {
  res.render('users/views/selectServiceWithOrganisation', model);
};

const buildRedirectURL = (req, serviceOrgDetails) => {
  const orgId = serviceOrgDetails.Organisation.id;
  const isEndUser = isOrgEndUser(req.userOrganisations, orgId);
  let redirectURL;
  if (isEndUser) {
    redirectURL = `/request-service/${orgId}/users/${req.user.sub}/edit-services/${serviceOrgDetails.Service.id}`;
  } else {
    redirectURL = `/approvals/${serviceOrgDetails.Organisation.id}/users/${req.user.sub}/services/${serviceOrgDetails.Service.id}`;
    if (isRemoveService(req)) {
      redirectURL += '/remove-service';
    }
  }
  return redirectURL;
};

const get = async (req, res) => {
  // get visible service orgs for this user: checking isExternalService, hideApprover, user is approver at that org
  const serviceOrganisations = await services.getFilteredUserServicesWithOrganisation(req.user.sub, false);
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
  const serviceOrganisations = await services.getFilteredUserServicesWithOrganisation(req.user.sub, false);
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
