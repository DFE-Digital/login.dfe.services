'use strict';
const {getAllServices} = require('./../../infrastructure/applications');
const {getAllServicesForUserInOrg} = require('./utils');

const getAllAvailableServices = async (req) => {
  const allServices = await getAllServices(req.id);
  let externalServices = allServices.services.filter(x => x.isExternalService === true);
  if (req.params.uid) {
    const allUserServicesInOrg = await getAllServicesForUserInOrg(req.params.uid, req.params.orgId, req.id);
    externalServices = externalServices.filter(ex => !allUserServicesInOrg.find(as => as.id === ex.id));
  }
  return externalServices;
};

const get = async (req, res) => {

  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users`)
  }
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === req.params.orgId);
  const externalServices = await getAllAvailableServices(req);

  let backRedirect;
  if (req.session.user.isInvite) {
    req.params.uid ? backRedirect = `/approvals/${req.params.orgId}/users/${req.params.uid}/confirm-user` : backRedirect = 'new-user';
  } else {
    backRedirect = 'services'
  }
  const model = {
    csrfToken: req.csrfToken(),
    name: req.session.user ? `${req.session.user.firstName} ${req.session.user.lastName}` : '',
    user: req.session.user,
    validationMessages: {},
    backLink: backRedirect,
    currentPage: 'users',
    organisationDetails,
    services: externalServices,
    selectedServices: req.session.user.services ? req.session.user.services : [],
  };

  res.render('users/views/associateServices', model);
};

const validate = async (req) => {
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === req.params.orgId);
  const externalServices = await getAllAvailableServices(req);
  let backRedirect;
  if (req.session.user.isInvite) {
    req.params.uid ? backRedirect = `/approvals/${req.params.orgId}/users/${req.params.uid}/confirm-user` : backRedirect = 'new-user';
  } else {
    backRedirect = 'services'
  }
  const model = {
    name: req.session.user ? `${req.session.user.firstName} ${req.session.user.lastName}` : '',
    user: req.session.user,
    backLink: backRedirect,
    currentPage: 'users',
    organisationDetails,
    services: externalServices,
    selectedServices: req.body.service,
    validationMessages: {},
  };
  if (!model.selectedServices) {
    model.validationMessages.services = 'At least one service must be selected';
  }
  return model;
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users`)
  }

  const model = await validate(req);
  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return res.render('users/views/associateServices', model);
  }

  let selectedServices = req.body.service;
  if (!(selectedServices instanceof Array)) {
    selectedServices = [req.body.service];
  }

  req.session.user.services = selectedServices.map((serviceId) => {
    const existingServiceSelections = req.session.user.services ? req.session.user.services.find(x => x.serviceId === serviceId) : undefined;
    return {
      serviceId,
      roles: existingServiceSelections ? existingServiceSelections.roles : [],
    };
  });

  const service = req.session.user.services[0].serviceId;
  return res.redirect(`associate-services/${service}`)
};

module.exports = {
  get,
  post
};
