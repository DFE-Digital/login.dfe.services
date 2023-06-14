'use strict';
const config = require('../../infrastructure/config');
const { getAllServicesForUserInOrg } = require('../users/utils');
const PolicyEngine = require('login.dfe.policy-engine');
const { getOrganisationAndServiceForUserV2 } = require('../../infrastructure/organisations');
const { checkCacheForAllServices } = require('../../infrastructure/helpers/allServicesAppCache');
const { recordRequestServiceBannerAck } = require('../../infrastructure/helpers/common');
const { actions } = require('../constans/actions');
const { checkForActiveRequests } = require('./utils');
const policyEngine = new PolicyEngine(config);

const renderAssociateServicesPage = (_req, res, model) => {
  res.render('requestService/views/requestService', model);
};

const buildBackLink = (req) => {
  let backRedirect = `/approvals/select-organisation?action=${actions.REQUEST_SERVICE}`;
  if (req.session.user) {
    const orgCount = req.session.user.orgCount;
    if (orgCount === 1) {
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
    res.redirect(`/my-services`);
  }
  //Recording request-a-service banner acknowledgement by end-user
  await recordRequestServiceBannerAck(req.session.user.uid);

  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === req.params.orgId);
  req.session.organisationDetails = organisationDetails;
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
  const organisationDetails = req.session.organisationDetails;
  if (organisationDetails === undefined) {
    organisationDetails = req.userOrganisations.find((x) => x.organisation.id === req.params.orgId);
  }
  const externalServices = await getAllAvailableServices(req);
  //collect the service id and the userid and the organisation id and check the request for existence of a request

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
  let selectServiceID = req.body.service;
  let orgdetails = req.userOrganisations.find((x) => x.organisation.id === req.params.orgId);
  let isRequests = await checkForActiveRequests(
    orgdetails,
    selectServiceID,
    req.params.orgId,
    req.session.user.uid,
    req.id,
  );
  if (isRequests !== undefined) {
    const allServices = await checkCacheForAllServices(req.id);
    const serviceDetails = allServices.services.find((x) => x.id === selectServiceID);
    const place = config.hostingEnvironment.helpUrl;
    if (!Array.isArray(isRequests)) {
      res.csrfToken = req.csrfToken();
      res.flash('title', `Important`);
      res.flash('heading', `Service already requested: ${serviceDetails.name}`);
      res.flash(
        'message',
        `Your request has been sent to Approvers at ${orgdetails.organisation.name} on ${new Date(
          isRequests,
        ).toLocaleDateString()} <br> You must wait for an Approver to action this request before you can send the request again. Please contact your Approver for more information. <br> <a href='${place}/services/request-access'>Help with requesting a service</a> `,
      );
    } else {
      res.csrfToken = req.csrfToken();
      res.flash('title', `Important`);
      res.flash('heading', `Your request cannot be completed as you have no approvers at this oranisation`);
      res.flash('message', `Please <a href='${place}/contact-us'>Contact us</a> for help.`);
    }
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
    renderAssociateServicesPage(req, res, model);
  }
  const service = selectServiceID;
  return res.redirect(`/request-service/${req.session.user.organisation}/users/${req.user.sub}/services/${service}`);
};

module.exports = {
  get,
  post,
};
