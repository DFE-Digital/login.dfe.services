const { getServiceRolesRaw } = require("login.dfe.api-client/services");
const { getUserDetails } = require("../users/utils");
const {
  isServiceEmailNotificationAllowed,
} = require("../../../src/infrastructure/applications");
const logger = require("../../infrastructure/logger");
const config = require("../../infrastructure/config");
const PolicyEngine = require("login.dfe.policy-engine");
const policyEngine = new PolicyEngine(config);
const { NotificationClient } = require("login.dfe.jobs-client");
const {
  checkCacheForAllServices,
} = require("../../infrastructure/helpers/allServicesAppCache");
const {
  getUserServiceRequestStatus,
  updateServiceRequest,
} = require("./utils.js");

const getViewModel = async (req) => {
  const organisationDetails = req.userOrganisations.find(
    (x) => x.organisation.id === req.params.orgId,
  );
  const serviceId = req.params.sid;
  const roleIds = JSON.parse(decodeURIComponent(req.params.rids));
  const roles = roleIds || [];

  const endUser = await getUserDetails(req);

  const allServices = await checkCacheForAllServices(req.id);
  const serviceDetails = allServices.services.find((x) => x.id === serviceId);
  const allRolesOfServiceUnsorted = await getServiceRolesRaw({
    serviceId: req.params.sid,
  });
  const allRolesOfService = allRolesOfServiceUnsorted.sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const roleDetails = allRolesOfService.filter((x) =>
    roles.find((y) => y.toLowerCase() === x.id.toLowerCase()),
  );

  const service = {
    serviceId,
    name: serviceDetails.name,
    roles: roleDetails,
  };

  const model = {
    csrfToken: req.csrfToken(),
    currentPage: "users",
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
      uid: req.session.user.uid ? req.session.user.uid : "",
    },
    title: "Reject sub-service request - DfE Sign-in",
    validationMessages: {},
    endUserName: `${endUser.firstName} ${endUser.lastName}`,
    endUserEmail: endUser.email,
    service,
    organisationDetails,
    endUser,
  };

  return model;
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/my-services");
  }

  const model = await getViewModel(req);

  const userSubServiceRequestID = req.params.reqID;
  const endUserId = req.params.uid;
  const { orgId } = req.params;
  const serviceId = req.params.sid;
  const roleIds = JSON.parse(decodeURIComponent(req.params.rids));
  const roles = roleIds || [];
  const reqId = req.id;
  const { endUser } = model;

  if (userSubServiceRequestID) {
    const userServiceRequestStatus = await getUserServiceRequestStatus(
      userSubServiceRequestID,
    );
    if (userServiceRequestStatus === -1) {
      model.validationMessages = {};
      return res.render("requestService/views/requestAlreadyRejected", model);
    }

    if (userServiceRequestStatus === 1) {
      model.validationMessages = {};
      return res.render("requestService/views/requestAlreadyApproved", model);
    }
  }

  const policyValidationResult = await policyEngine.validate(
    endUserId,
    orgId,
    serviceId,
    roles,
    reqId,
  );

  if (policyValidationResult.length > 0) {
    model.validationMessages.roles = policyValidationResult.map(
      (x) => x.message,
    );
  }

  if (!req.session.user) {
    req.session.user = {};
  }

  req.session.user.uid = endUser.id;
  req.session.user.firstName = endUser.firstName;
  req.session.user.lastName = endUser.lastName;
  req.session.user.email = endUser.email;
  req.session.user.services = [model.service];

  return res.render("requestService/views/rejectRolesRequest", model);
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/my-services");
  }

  const rejectReason = req.body.reason ? req.body.reason : "";
  const model = await getViewModel(req);
  const userSubServiceRequestID = req.params.reqID;
  const endUserId = req.params.uid;
  const { orgId } = req.params;
  const serviceId = req.params.sid;
  const reqId = req.id;
  const roleIds = JSON.parse(decodeURIComponent(req.params.rids));
  const roles = roleIds || [];
  const approverDetails = req.user;
  const endUserDetails = req.session.user;
  const { organisation } = model.organisationDetails;
  const { service } = model;
  const rolesName = model.service.roles.map((r) => r.name);

  const policyValidationResult = await policyEngine.validate(
    endUserId,
    orgId,
    serviceId,
    roles,
    reqId,
  );

  if (policyValidationResult.length > 0) {
    model.validationMessages.roles = policyValidationResult.map(
      (x) => x.message,
    );
    return res.render("requestService/views/rejectRolesRequest", model);
  }

  if (userSubServiceRequestID) {
    const updateServiceReq = await updateServiceRequest(
      userSubServiceRequestID,
      -1,
      approverDetails.sub,
      rejectReason,
    );
    const resStatus = updateServiceReq.serviceRequest.status;

    if (updateServiceReq.success === false && resStatus === -1) {
      model.validationMessages = {};
      return res.render("requestService/views/requestAlreadyRejected", model);
    }
    if (updateServiceReq.success === false && resStatus === 1) {
      model.validationMessages = {};
      return res.render("requestService/views/requestAlreadyApproved", model);
    }
  }

  const isEmailAllowed = await isServiceEmailNotificationAllowed();
  if (isEmailAllowed) {
    const notificationClient = new NotificationClient({
      connectionString: config.notifications.connectionString,
    });
    await notificationClient.sendSubServiceRequestRejected(
      endUserDetails.email,
      endUserDetails.firstName,
      endUserDetails.lastName,
      organisation.name,
      service.name,
      rolesName,
      rejectReason,
    );
  }
  logger.audit({
    type: "sub-service",
    subType: "sub-service request Rejected",
    userId: approverDetails.sub,
    userEmail: approverDetails.email,
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${approverDetails.email} (approverId: ${
      approverDetails.sub
    }) rejected sub-service request for (serviceId: ${serviceId}) and sub-services (roleIds: ${JSON.stringify(
      roles,
    )}) for organisation (orgId: ${orgId}) for end user (endUserId: ${endUserId}). ${
      rejectReason ? `The reject reason is ${rejectReason}` : ""
    } - requestId (reqId: ${userSubServiceRequestID})`,
  });

  res.flash("title", "Success");
  res.flash("heading", "Sub-service request rejected");
  res.flash(
    "message",
    "The user who raised the request will receive an email to tell them their sub-service access request has been rejected.",
  );

  res.redirect("/my-services");
};

module.exports = {
  get,
  post,
};
