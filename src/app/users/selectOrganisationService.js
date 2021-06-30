'use strict';

const { services } = require('login.dfe.dao');

const renderSelectOrganisationServicePage = (req, res, model) => {
  res.render('users/views/selectOrganisationService', model);
};

const get = async (req, res) => {
  const serviceOrganisations = await services.getUserServicesWithOrganisationOnlyApprover(req.user.sub);

  const model = {
    csrfToken: req.csrfToken(),
    title: 'Edit which service?',
    serviceOrganisations,
    currentPage: 'services',
    selectedServiceOrganisation: null,
    validationMessages: {},
    backLink: '/my-services',
  };

  renderSelectOrganisationServicePage(req, res, model);
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
  const serviceOrganisations = await services.getServicesForUserIncludingOrganisation(req.user.sub);

  // TODO store in session the selected item
  // and see if there is anything left to do

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    model.serviceOrganisations = serviceOrganisations;
    return renderSelectOrganisationServicePage(req, res, model);
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
