const sanitizeHtml = require("sanitize-html");
const { getServiceRolesRaw } = require("login.dfe.api-client/services");
const { getUserDetails } = require("../users/utils");
const Account = require("../../infrastructure/account");
const logger = require("../../infrastructure/logger");
const config = require("../../infrastructure/config");

const PolicyEngine = require("login.dfe.policy-engine");
const policyEngine = new PolicyEngine(config);

const { NotificationClient } = require("login.dfe.jobs-client");
const notificationClient = new NotificationClient({
  connectionString: config.notifications.connectionString,
});

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
  const allRolesOfServiceUnsorted = await getServiceRolesRaw({ serviceId });
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
    title: "Reject service request",
    validationMessages: {},
    endUserName: `${endUser.firstName} ${endUser.lastName}`,
    endUserEmail: endUser.email,
    service,
    organisationDetails,
  };

  return model;
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/my-services");
  }

  const model = await getViewModel(req);

  const userServiceRequestId = req.query.reqId;

  if (userServiceRequestId) {
    const userServiceRequestStatus =
      await getUserServiceRequestStatus(userServiceRequestId);
    if (userServiceRequestStatus === -1) {
      model.validationMessages = {};
      return res.render("requestService/views/requestAlreadyRejected", model);
    }

    if (userServiceRequestStatus === 1) {
      model.validationMessages = {};
      return res.render("requestService/views/requestAlreadyApproved", model);
    }
  }

  const roleIds = JSON.parse(decodeURIComponent(req.params.rids));
  const roles = roleIds || [];

  const policyValidationResult = await policyEngine.validate(
    req.params.uid,
    req.params.orgId,
    req.params.sid,
    roles,
    req.id,
  );

  if (policyValidationResult.length > 0) {
    model.validationMessages.roles = policyValidationResult.map(
      (x) => x.message,
    );
  }

  if (!req.session.user) {
    req.session.user = {};
  }

  const endUser = await getUserDetails(req);

  req.session.user.uid = endUser.id;
  req.session.user.firstName = endUser.firstName;
  req.session.user.lastName = endUser.lastName;
  req.session.user.email = endUser.email;
  req.session.user.services = [model.service];

  return res.render("requestService/views/rejectServiceRequest", model);
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/my-services");
  }

  const model = await getViewModel(req);
  const roleIds = JSON.parse(decodeURIComponent(req.params.rids));
  const roles = roleIds || [];

  const policyValidationResult = await policyEngine.validate(
    req.params.uid,
    req.params.orgId,
    req.params.sid,
    roles,
    req.id,
  );

  if (policyValidationResult.length > 0) {
    model.validationMessages.roles = policyValidationResult.map(
      (x) => x.message,
    );
    return res.render("requestService/views/rejectServiceRequest", model);
  }

  const rejectReason = (req.body.reason ? req.body.reason : "").trim();
  if (rejectReason.length > 1000 || rejectReason.length === 0) {
    model.validationMessages.reason =
      rejectReason.length > 1000
        ? "Reason cannot be longer than 1000 characters"
        : "Enter a reason for rejection";
    return res.render("requestService/views/rejectServiceRequest", model);
  }

  const userServiceRequestId = req.query.reqId;

  if (userServiceRequestId) {
    const updateServiceReq = await updateServiceRequest(
      userServiceRequestId,
      -1,
      req.user.sub,
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
  await notificationClient.sendServiceRequestRejected(
    req.session.user.email,
    req.session.user.firstName,
    req.session.user.lastName,
    model.organisationDetails.organisation.name,
    model.service.name,
    model.service.roles.map((i) => i.name),
    rejectReason,
  );

  const account = Account.fromContext(req.user);
  const endUsersName =
    req.session.user.firstName + " " + req.session.user.lastName;
  await notificationClient.sendServiceRequestOutcomeToApprovers(
    account.id,
    req.session.user.email,
    endUsersName,
    model.organisationDetails.organisation.id,
    model.organisationDetails.organisation.name,
    model.service.name,
    model.service.roles.map((i) => i.name),
    false,
    rejectReason,
  );

  logger.audit({
    type: "services",
    subType: "access-request-rejected",
    userId: req.user.uid,
    userEmail: req.user.email,
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${req.user.email} (approverId: ${req.user.sub}) rejected service (serviceId: ${req.params.sid}), roles (roleIds: ${JSON.stringify(roles)}) and organisation (orgId: ${req.params.orgId}) for end user (endUserId: ${req.params.uid}). ${rejectReason ? `The reject reason is ${rejectReason}` : ""} - requestId (reqId: ${userServiceRequestId})`,
  });

  res.flash("title", `Success`);
  res.flash("heading", `Request rejected successfully`);
  res.flash(
    "message",
    sanitizeHtml(
      "An email will be sent to the requestee informing them of their request rejection.",
    ),
  );

  res.redirect(`/my-services`);
};

module.exports = {
  get,
  post,
};
