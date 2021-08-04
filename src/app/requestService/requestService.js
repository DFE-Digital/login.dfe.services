'use strict';
const config = require('../../infrastructure/config');
const { getAllServicesForUserInOrg } = require('../users/utils');
const PolicyEngine = require('login.dfe.policy-engine');
const { getOrganisationAndServiceForUserV2 } = require('../../infrastructure/organisations');
const { checkCacheForAllServices } = require('../../infrastructure/helpers/allServicesAppCache');

const policyEngine = new PolicyEngine(config);

const renderAssociateServicesPage = (_req, res, model) => {
  res.render('requestService/views/requestService', model);
};

const buildBackLink = (req) => {
  let backRedirect = '/approvals/select-organisation?services=request';
  if(req.session.user) {
    const orgCount = req.session.user.orgCount
    if(orgCount === 1) {
      backRedirect = '/my-services';
    }
  }
  return backRedirect;
};

const getAllAvailableServices = async (req) => {
  const allServices = await checkCacheForAllServices(req.id);
  let externalServices = allServices.services.filter(
    (x) =>
      x.isExternalService === true &&
      !(x.relyingParty && x.relyingParty.params && x.relyingParty.params.hideApprover === 'true'),
  );
  if (req.params.uid) {
    const allUserServicesInOrg = await getAllServicesForUserInOrg(req.params.uid, req.params.orgId, req.id);
    externalServices = externalServices.filter((ex) => !allUserServicesInOrg.find((as) => as.id === ex.id));
  }
  const servicesNotAvailableThroughPolicies = [];
  const userOrganisations =
    req.params.uid && !req.params.uid.startsWith('inv-')
      ? await getOrganisationAndServiceForUserV2(req.params.uid, req.id)
      : undefined;
  const userAccessToSpecifiedOrganisation = userOrganisations
    ? userOrganisations.find((x) => x.organisation.id.toLowerCase() === req.params.orgId.toLowerCase())
    : undefined;
  for (let i = 0; i < externalServices.length; i++) {
    const policyResult = await policyEngine.getPolicyApplicationResultsForUser(
      userAccessToSpecifiedOrganisation ? req.params.uid : undefined,
      req.params.orgId,
      externalServices[i].id,
      req.id,
    );
    if (!policyResult.serviceAvailableToUser) {
      servicesNotAvailableThroughPolicies.push(externalServices[i].id);
    }
  }
  return externalServices.filter((x) => !servicesNotAvailableThroughPolicies.find((y) => x.id === y));
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/my-services`);
  }
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === req.params.orgId);
  const externalServices = await getAllAvailableServices(req);

  const model = {
    csrfToken: req.csrfToken(),
    name: req.session.user ? `${req.session.user.firstName} ${req.session.user.lastName}` : '',
    user: req.session.user,
    validationMessages: {},
    backLink: buildBackLink(req),
    currentPage: 'services',
    organisationDetails,
    services: externalServices,
    selectedServices: req.session.user.services || [],
    isInvite: req.session.user.isInvite,
  };

  renderAssociateServicesPage(req, res, model);
};

const validate = async (req) => {
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === req.params.orgId);
  const externalServices = await getAllAvailableServices(req);
  // TODO make selectedServices non array (selectedService) and refactor all code related to array in this file and in the EJS template
  let selectedServices = [];
  if (req.body.service && req.body.service instanceof Array) {
    selectedServices = req.body.service;
  } else if (req.body.service) {
    selectedServices = [req.body.service];
  }
  const model = {
    name: req.session.user ? `${req.session.user.firstName} ${req.session.user.lastName}` : '',
    user: req.session.user,
    backLink: buildBackLink(req),
    currentPage: 'services',
    organisationDetails,
    services: externalServices,
    selectedServices,
    isInvite: req.session.user.isInvite,
    validationMessages: {},
  };
  if (model.selectedServices.length < 1) {
    model.validationMessages.services = 'Select a service to continue';
  }
  if (
    model.selectedServices &&
    model.selectedServices.filter((sid) => !externalServices.find((s) => s.id.toLowerCase() === sid.toLowerCase()))
      .length > 0
  ) {
    model.validationMessages.services = 'A service was selected that is no longer available';
  }
  return model;
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/my-services');
  }

  const model = await validate(req);

  // persist current selection in session
  req.session.user.services = model.selectedServices.map((serviceId) => {
    const existingServiceSelections = req.session.user.services
      ? req.session.user.services.find((x) => x.serviceId === serviceId)
      : undefined;
    return {
      serviceId,
      roles: existingServiceSelections ? existingServiceSelections.roles : [],
    };
  });

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return renderAssociateServicesPage(req, res, model);
  }

  const service = req.session.user.services[0].serviceId;
  return res.redirect(`/request-service/${req.session.user.organisation}/users/${req.user.sub}/services/${service}`);
};

module.exports = {
  get,
  post,
};
