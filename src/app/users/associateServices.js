'use strict';
const config = require('./../../infrastructure/config');
const { getAllServices } = require('./../../infrastructure/applications');
const { getAllServicesForUserInOrg } = require('./utils');
const PolicyEngine = require('login.dfe.policy-engine');
const { getOrganisationAndServiceForUserV2 } = require('./../../infrastructure/organisations');


const policyEngine = new PolicyEngine(config);

const getAllAvailableServices = async (req) => {
  const allServices = await getAllServices(req.id);
  let externalServices = allServices.services.filter(x => x.isExternalService === true && !(x.relyingParty && x.relyingParty.params && x.relyingParty.params.hideApprover === 'true'));
  if (req.params.uid) {
    const allUserServicesInOrg = await getAllServicesForUserInOrg(req.params.uid, req.params.orgId, req.id);
    externalServices = externalServices.filter(ex => !allUserServicesInOrg.find(as => as.id === ex.id));
  }
  const servicesNotAvailableThroughPolicies = [];
  const userOrganisations = (req.params.uid && !req.params.uid.startsWith('inv-')) ? await getOrganisationAndServiceForUserV2(req.params.uid, req.id) : undefined;
  const userAccessToSpecifiedOrganisation = userOrganisations ? userOrganisations.find(x => x.organisation.id.toLowerCase() === req.params.orgId.toLowerCase()) : undefined;
  for (let i = 0; i < externalServices.length; i++) {
    const policyResult = await policyEngine.getPolicyApplicationResultsForUser(userAccessToSpecifiedOrganisation ? req.params.uid : undefined, req.params.orgId, externalServices[i].id, req.id);
    if (!policyResult.serviceAvailableToUser) {
      servicesNotAvailableThroughPolicies.push(externalServices[i].id);
    }
  }
  return externalServices.filter(x => !servicesNotAvailableThroughPolicies.find(y => x.id === y));
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

  let selectedServices = [];
  if (req.body.service && req.body.service instanceof Array) {
    selectedServices = req.body.service;
  } else if (req.body.service) {
    selectedServices = [req.body.service];
  }
  const model = {
    name: req.session.user ? `${req.session.user.firstName} ${req.session.user.lastName}` : '',
    user: req.session.user,
    backLink: backRedirect,
    currentPage: 'users',
    organisationDetails,
    services: externalServices,
    selectedServices,
    validationMessages: {},
  };
  if (model.selectedServices.length < 1) {
    model.validationMessages.services = 'At least one service must be selected';
  }
  if (model.selectedServices && model.selectedServices.filter(sid => !externalServices.find(s => s.id.toLowerCase() === sid.toLowerCase())).length > 0) {
    model.validationMessages.services = 'A service was selected that is no longer available';
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



  req.session.user.services = model.selectedServices.map((serviceId) => {
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
