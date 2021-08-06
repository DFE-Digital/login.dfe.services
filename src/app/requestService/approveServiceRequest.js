'use strict';
const { listRolesOfService, addUserService, getServicesForUser } = require('../../infrastructure/access');
const { getUserDetails } = require('../users/utils');

const logger = require('../../infrastructure/logger');
const config = require('../../infrastructure/config');

const PolicyEngine = require('login.dfe.policy-engine');
const policyEngine = new PolicyEngine(config);

const NotificationClient = require('login.dfe.notifications.client');
const notificationClient = new NotificationClient({
  connectionString: config.notifications.connectionString,
});

const { checkCacheForAllServices } = require('../../infrastructure/helpers/allServicesAppCache');

const renderApproveRequestPage = (req, res, model) => {
  const isServiceAlreadyApproved = false;
  let renderUrl;
  if(isServiceAlreadyApproved) {
    renderUrl = 'requestService/views/serviceAlreadyApproved'
  }
  else {
    model.backLink = buildBackLink(req)
    renderUrl = 'requestService/views/approveServiceRequest'
  }

  res.render(renderUrl, model);
};

const buildBackLink = (req) => {
  let backRedirect = `/request-service/${req.params.orgId}/users/${req.params.uid}/services/${req.params.sid}`;
  return backRedirect;
};

const getViewModel = async (req) => {
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === req.params.orgId);
  const serviceId = req.params.sid;
  const roleIds = JSON.parse(decodeURIComponent(req.params.rids))
  const roles = roleIds || [];

  const endUser = await getUserDetails(req);

  const allServices = await checkCacheForAllServices(req.id);
  const serviceDetails = allServices.services.find((x) => x.id === serviceId);
  const allRolesOfService = await listRolesOfService(serviceId, req.id);
  const roleDetails = allRolesOfService.filter((x) => roles.find((y) => y.toLowerCase() === x.id.toLowerCase()));

  const serviceUrl = `/approvals/${req.params.orgId}/users/${req.params.uid}/associate-services`
  const subServiceUrl = `/approvals/${req.params.orgId}/users/${req.params.uid}/associate-services/${req.params.sid}`

  const service = {
    serviceId,
    name: serviceDetails.name,
    roles: roleDetails,
  };

  const model = {
    csrfToken: req.csrfToken(),
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
      isInvite: req.session.user.isInvite ? req.session.user.isInvite : false,
      uid: req.session.user.uid ? req.session.user.uid : '',
    },
    validationMessages: {},
    endUserName: `${endUser.firstName} ${endUser.lastName}`,
    endUserEmail: endUser.email,
    service,
    organisationDetails,
    serviceUrl,
    subServiceUrl
  }

  return model
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/my-services');
  }
  
  const endUserService = await getServicesForUser(req.params.uid)

  if(endUserService) {
    const hasServiceAlreadyApproved = endUserService.filter(i => i.serviceId === req.params.sid && i.organisationId === req.params.orgId)
    if(hasServiceAlreadyApproved && hasServiceAlreadyApproved.length > 0) {
      return res.render('requestService/views/serviceAlreadyApproved');
    }
  }

  const model = await getViewModel(req)

  const roleIds = JSON.parse(decodeURIComponent(req.params.rids))
  const roles = roleIds || [];

  const policyValidationResult = await policyEngine.validate(
    req.params.uid,
    req.params.orgId,
    req.params.sid,
    roles,
    req.id,
  );

  if (policyValidationResult.length > 0) {
    model.validationMessages.roles = policyValidationResult.map((x) => x.message)  
  }

  if (!req.session.user) {
    req.session.user = {};
  }

  const endUser = await getUserDetails(req);

  req.session.user.uid = endUser.id
  req.session.user.firstName = endUser.firstName
  req.session.user.lastName = endUser.lastName
  req.session.user.email = endUser.email
  req.session.user.services = [model.service]

  renderApproveRequestPage(req, res, model);  
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/my-services');
  }

  const model = await getViewModel(req)

  const roleIds = JSON.parse(decodeURIComponent(req.params.rids))
  const roles = roleIds || [];
  
  const policyValidationResult = await policyEngine.validate(
    req.params.uid,
    req.params.orgId,
    req.params.sid,
    roles,
    req.id,
  )

  if (policyValidationResult.length > 0) {
    model.validationMessages.roles = policyValidationResult.map((x) => x.message)
    renderApproveRequestPage(req, res, model);  
  }

  await addUserService(req.params.uid, req.params.sid, req.params.orgId, roles, req.id);

  await notificationClient.sendServiceRequestApproved(
    req.session.user.email, 
    req.session.user.firstName, 
    req.session.user.lastName, 
    model.organisationDetails.organisation.name,
    model.service.name,
    model.service.roles.map(i => i.name)
  )

  logger.audit({
    type: 'services',
    subType: 'access-request',
    userId: req.user.uid,
    userEmail: req.user.email,
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${req.user.email} (approverId: ${req.user.sub}) approved service (serviceId: ${req.params.sid}) and roles (roleIds: ${JSON.stringify(roles)}) and organisation (orgId: ${req.params.orgId}) for end user (endUserId: ${req.params.uid})`
  });

  res.flash('title', `Success`);
  res.flash('heading', `Service request approved`);
  res.flash('message', `The user who raised the request will receive an email to tell them their service access request was approved.`);

  res.redirect(`/my-services`);
};

module.exports = {
  get,
  post,
};
