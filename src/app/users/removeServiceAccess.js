const logger = require("./../../infrastructure/logger");
const {
  getSingleServiceForUser,
  waitForIndexToUpdate,
  isUserManagement,
  isRemoveService,
} = require("./utils");
const {
  removeServiceFromUser,
  removeServiceFromInvitation,
} = require("./../../infrastructure/access");
const { getById, updateIndex } = require("./../../infrastructure/search");
const config = require("./../../infrastructure/config");
const { NotificationClient } = require("login.dfe.jobs-client");
const {
  isServiceEmailNotificationAllowed,
} = require("./../../infrastructure/applications");
const { actions } = require("../constans/actions");

const renderRemoveServicePage = (req, res, model) => {
  const isManage = isUserManagement(req);
  res.render(
    `users/views/${isManage ? "removeService" : "removeServiceRedesigned"}`,
    { ...model, currentPage: isManage ? "users" : "services" },
  );
};

const buildBackLink = (req) => {
  const isRemoveServiceUrl = isRemoveService(req);
  if (isRemoveServiceUrl) {
    return `/approvals/${req.params.orgId}/users/${req.params.uid}/associate-services?action=${actions.REMOVE_SERVICE}`;
  } else if (!isUserManagement(req)) {
    return `/approvals/select-organisation-service?action=${actions.REMOVE_SERVICE}`;
  } else {
    return `/approvals/users/${req.params.uid}`;
  }
};

const buildCancelLink = (req) => {
  if (isUserManagement(req)) {
    return `/approvals/users/${req.params.uid}`;
  }
  return "/my-services";
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/users/${req.params.uid}`);
  }
  const service = await getSingleServiceForUser(
    req.params.uid,
    req.params.orgId,
    req.params.sid,
    req.id,
  );
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find(
    (x) => x.organisation.id === organisationId,
  );
  const model = {
    backLink: buildBackLink(req),
    cancelLink: buildCancelLink(req),
    currentPage: "users",
    csrfToken: req.csrfToken(),
    organisationDetails,
    service,
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
    },
  };
  return renderRemoveServicePage(req, res, model);
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/users/${req.params.uid}`);
  }
  const uid = req.params.uid;
  const serviceId = req.params.sid;
  const organisationId = req.params.orgId;
  const service = await getSingleServiceForUser(
    uid,
    organisationId,
    serviceId,
    req.id,
  );
  const organisationDetails = req.userOrganisations.find(
    (x) => x.organisation.id === organisationId,
  );
  const org = organisationDetails.organisation.name;
  const isEmailAllowed = await isServiceEmailNotificationAllowed();

  if (uid.startsWith("inv-")) {
    await removeServiceFromInvitation(
      uid.substr(4),
      serviceId,
      organisationId,
      req.id,
    );
  } else {
    await removeServiceFromUser(uid, serviceId, organisationId, req.id);
    if (isEmailAllowed) {
      const notificationClient = new NotificationClient({
        connectionString: config.notifications.connectionString,
      });
      await notificationClient.sendUserServiceRemoved(
        req.session.user.email,
        req.session.user.firstName,
        req.session.user.lastName,
        service.name,
        org,
      );
    }
  }

  const getAllUserDetails = await getById(uid, req.id);
  const currentServiceDetails = getAllUserDetails.services;
  const serviceRemoved = currentServiceDetails.findIndex(
    (x) => x === serviceId,
  );
  const updatedServiceDetails = currentServiceDetails.filter(
    (_, index) => index !== serviceRemoved,
  );
  await updateIndex(uid, null, null, updatedServiceDetails, req.id);
  await waitForIndexToUpdate(
    uid,
    (updated) => updated.services.length === updatedServiceDetails.length,
  );

  logger.audit({
    type: "approver",
    subType: "user-service-deleted",
    userId: req.user.sub,
    userEmail: req.user.email,
    meta: {
      editedFields: [
        {
          name: "remove_service",
          oldValue: serviceId,
          newValue: undefined,
        },
      ],
      editedUser: uid,
    },
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${req.user.email} (id: ${req.user.sub}) removed service ${service.name} for organisation ${org} (id: ${organisationId}) for user ${req.session.user.email} (id: ${uid})`,
  });

  res.flash("title", `Success`);
  res.flash("heading", `Service removed: ${service.name}`);

  if (isUserManagement(req)) {
    res.flash(
      "message",
      `This service (and its associated roles) has been removed from this user's account.`,
    );
    return res.redirect(`/approvals/users/${uid}`);
  } else {
    res.flash(
      "message",
      `This service (and its associated roles) has been removed from your account.`,
    );
    res.redirect(`/my-services`);
  }
};

module.exports = {
  get,
  post,
};
