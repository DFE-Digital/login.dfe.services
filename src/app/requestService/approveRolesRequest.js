'use strict';
const { listRolesOfService, updateUserService } = require('../../../src/infrastructure/access');
const { getUserDetails } = require('../users/utils');
const { actions } = require('../constans/actions');
const { checkCacheForAllServices } = require('../../infrastructure/helpers/allServicesAppCache');
const { getUserServiceRequestStatus, updateServiceRequest } = require('./utils');
const { isServiceEmailNotificationAllowed } = require('../../../src/infrastructure/applications');

const logger = require('../../infrastructure/logger');
const config = require('../../infrastructure/config');

const PolicyEngine = require('login.dfe.policy-engine');
const policyEngine = new PolicyEngine(config);

const NotificationClient = require('login.dfe.notifications.client');

const validate = async (req) => {
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === req.params.orgId);
  const endUser = await getUserDetails(req);
  const model = {
    csrfToken: req.csrfToken(),
    currentPage: 'users',
    organisationDetails,
    endUserName: `${endUser.firstName} ${endUser.lastName}`,
    endUserEmail: endUser.email,
    validationMessages: {},
    endUser,
  };

  return model;
};

const getViewModel = async (req, existingModel) => {
  const serviceId = req.params.sid;
  const roleIds = JSON.parse(decodeURIComponent(req.params.rids));
  const roles = roleIds || [];

  const allServices = await checkCacheForAllServices(req.id);
  const serviceDetails = allServices.services.find((x) => x.id === serviceId);
  const allRolesOfService = await listRolesOfService(serviceId, req.id);
  const roleDetails = allRolesOfService.filter((x) => roles.find((y) => y.toLowerCase() === x.id.toLowerCase()));

  const subServiceAmendUrl = `/approvals/${req.params.orgId}/users/${req.params.uid}/associate-services/${serviceId}?action=${actions.REQUEST_SUB_SERVICE}`;

  const service = {
    serviceId,
    name: serviceDetails.name,
    roles: roleDetails,
  };

  const model = {
    ...existingModel,
    subServiceAmendUrl,
    service,
  };

  return model;
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/my-services');
  }

  const model = await validate(req);
  const viewModel = await getViewModel(req, model);

  const userSubServiceRequestID = req.params.reqID;
  const endUserId = req.params.uid;
  const { orgId } = req.params;
  const serviceId = req.params.sid;
  const roleIds = JSON.parse(decodeURIComponent(req.params.rids));
  const roles = roleIds || [];
  const reqId = req.id;
  const action = actions.REQUEST_SUB_SERVICE;
  const { endUser } = model;

  if (userSubServiceRequestID) {
    const userServiceRequestStatus = await getUserServiceRequestStatus(userSubServiceRequestID);

    if (userServiceRequestStatus === -1) {
      viewModel.validationMessages = {};
      return res.render('requestService/views/requestAlreadyRejected', viewModel);
    }

    if (userServiceRequestStatus === 1) {
      viewModel.validationMessages = {};
      return res.render('requestService/views/requestAlreadyApproved', viewModel);
    }
  }

  if (!viewModel.validationMessages.messages) {
    const policyValidationResult = await policyEngine.validate(endUserId, orgId, serviceId, roles, reqId);

    if (policyValidationResult.length > 0) {
      viewModel.validationMessages.messages = policyValidationResult.map((x) => x.message);
    }

    if (!req.session.user) {
      req.session.user = {};
    }
    req.session.user.uid = endUser.id;
    req.session.user.firstName = endUser.firstName;
    req.session.user.lastName = endUser.lastName;
    req.session.user.email = endUser.email;
    req.session.user.services = [{ serviceId, roles }];
    req.session.user.serviceId = viewModel.service.serviceId;
    req.session.user.roleIds = roles;
    req.session.action = action;
    req.session.subServiceReqId = userSubServiceRequestID;
  }

  return res.render('requestService/views/approveRolesRequest', viewModel);
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/my-services');
  }

  const model = await validate(req);
  const viewModel = await getViewModel(req, model);

  const userSubServiceRequestID = req.params.reqID;
  const endUserId = req.params.uid;
  const { orgId } = req.params;
  const serviceId = req.params.sid;
  const roleIds = JSON.parse(decodeURIComponent(req.params.rids));
  const roles = roleIds || [];
  const reqId = req.id;
  const isEmailAllowed = await isServiceEmailNotificationAllowed();
  const endUserDetails = req.session.user;
  const approverDetails = req.user;
  const { service } = viewModel;
  const { organisation } = viewModel.organisationDetails;
  const rolesName = viewModel.service.roles.map((r) => r.name);

  if (viewModel.validationMessages.messages) {
    return res.render('requestService/views/approveRolesRequest', viewModel);
  }

  const policyValidationResult = await policyEngine.validate(endUserId, orgId, serviceId, roles, reqId);

  if (policyValidationResult.length > 0) {
    viewModel.validationMessages.messages = policyValidationResult.map((x) => x.message);
    return res.render('requestService/views/approveRolesRequest', viewModel);
  }

  if (userSubServiceRequestID) {
    const updateServiceReq = await updateServiceRequest(userSubServiceRequestID, 1, approverDetails.sub);

    const resStatus = updateServiceReq.serviceRequest.status;

    if (updateServiceReq.success === false && resStatus === -1) {
      model.validationMessages = {};
      return res.render('requestService/views/requestAlreadyRejected', viewModel);
    }
    if (updateServiceReq.success === false && resStatus === 1) {
      model.validationMessages = {};
      return res.render('requestService/views/requestAlreadyApproved', viewModel);
    }
  }

  await updateUserService(endUserId, serviceId, orgId, roles, reqId);

  if (isEmailAllowed) {
    const notificationClient = new NotificationClient({ connectionString: config.notifications.connectionString });
    await notificationClient.sendSubServiceRequestApproved(
      endUserDetails.email,
      endUserDetails.firstName,
      endUserDetails.lastName,
      organisation.name,
      service.name,
      rolesName,
    );
  }

  logger.audit({
    type: 'sub-service',
    subType: 'sub-service request Approved',
    userId: approverDetails.sub,
    userEmail: approverDetails.email,
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${approverDetails.email} (approverId: ${
      approverDetails.sub
    }) approved sub-service request for (serviceId: ${serviceId}) and sub-services (roleIds: ${JSON.stringify(
      roles,
    )}) and organisation (orgId: ${orgId}) for end user (endUserId: ${endUserId}) - requestId (reqId: ${userSubServiceRequestID})`,
  });

  res.flash('title', 'Success');
  res.flash('heading', 'Sub-service changes approved');
  res.flash(
    'message',
    `${endUserDetails.firstName} ${endUserDetails.lastName} will receive an email to tell them their sub-service access has changed.`,
  );

  res.redirect('/my-services');
};

module.exports = {
  get,
  post,
};
