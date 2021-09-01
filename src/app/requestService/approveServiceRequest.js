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

const validate = async (req) => {
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === req.params.orgId);
  const endUser = await getUserDetails(req);
  const model = {
    csrfToken: req.csrfToken(),
    currentPage: 'users',
    organisationDetails,
    endUserName: `${endUser.firstName} ${endUser.lastName}`,
    endUserEmail: endUser.email,
    validationMessages: {}
  }

  const serviceId = req.params.sid;
  const roleIds = JSON.parse(decodeURIComponent(req.params.rids))
  const roles = roleIds || [];

  if(req.session.user.serviceId && req.session.user.serviceId !== serviceId) {
    model.validationMessages.messages = 'Service not valid - please change service';
    return model;
  }

  if(req.session.user.roleIds) {
    if(JSON.stringify(req.session.user.roleIds) !== JSON.stringify(roles)) {
      model.validationMessages.messages = 'Sub-service not valid - please change sub-service';
      return model;
    }
  }

  return model;
};

const getViewModel = async (req, existingModel) => {
  const serviceId = req.session.user.serviceId ? req.session.user.serviceId : req.params.sid
  const roleIds = JSON.parse(decodeURIComponent(req.params.rids))
  const roles = (req.session.user.roleIds ? req.session.user.roleIds : roleIds) || [];

  const allServices = await checkCacheForAllServices(req.id);
  const serviceDetails = allServices.services.find((x) => x.id === serviceId);
  const allRolesOfService = await listRolesOfService(serviceId, req.id);
  const roleDetails = allRolesOfService.filter((x) => roles.find((y) => y.toLowerCase() === x.id.toLowerCase()));

  const serviceUrl = `/approvals/${req.params.orgId}/users/${req.params.uid}/associate-services`
  const subServiceUrl = `/approvals/${req.params.orgId}/users/${req.params.uid}/associate-services/${serviceId}`

  const service = {
    serviceId,
    name: serviceDetails.name,
    roles: roleDetails,
  };

  const model = {
    ...existingModel,
    service,
    serviceUrl,
    subServiceUrl
  }

  return model
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/my-services');
  }
  
  const model = await validate(req)
  const viewModel = await getViewModel(req, model) 
  const endUserService = await getServicesForUser(req.params.uid)

  if(endUserService) {
    const hasServiceAlreadyApproved = endUserService.filter(i => i.serviceId === req.params.sid && i.organisationId === req.params.orgId)
    if(hasServiceAlreadyApproved && hasServiceAlreadyApproved.length > 0) {
      viewModel.validationMessages = {}
      return res.render('requestService/views/serviceAlreadyApproved', viewModel)
    }
  }

  const roleIds = JSON.parse(decodeURIComponent(req.params.rids))
  const roles = roleIds || [];

  if(!viewModel.validationMessages.messages) {
    const policyValidationResult = await policyEngine.validate(
      req.params.uid,
      req.params.orgId,
      req.params.sid,
      roles,
      req.id,
    );

    if (policyValidationResult.length > 0) {
      viewModel.validationMessages.messages = policyValidationResult.map((x) => x.message)  
    }

    const endUser = await getUserDetails(req);

    if (!req.session.user) {
      req.session.user = {};
    }
  
    req.session.user.uid = endUser.id
    req.session.user.firstName = endUser.firstName
    req.session.user.lastName = endUser.lastName
    req.session.user.email = endUser.email
    req.session.user.services = [viewModel.service]
    req.session.user.serviceId = viewModel.service.serviceId
    req.session.user.roleIds = roles
  }

  return res.render('requestService/views/approveServiceRequest', viewModel) 
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/my-services');
  }

  const model = await validate(req)
  const viewModel = await getViewModel(req, model)

  if(viewModel.validationMessages.messages) {
    return res.render('requestService/views/approveServiceRequest', viewModel)
  }

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
    viewModel.validationMessages.messages = policyValidationResult.map((x) => x.message)
    return res.render('requestService/views/approveServiceRequest', viewModel) 
  }

  await addUserService(req.params.uid, req.params.sid, req.params.orgId, roles, req.id);

  await notificationClient.sendServiceRequestApproved(
    req.session.user.email, 
    req.session.user.firstName, 
    req.session.user.lastName, 
    viewModel.organisationDetails.organisation.name,
    viewModel.service.name,
    viewModel.service.roles.map(i => i.name)
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
