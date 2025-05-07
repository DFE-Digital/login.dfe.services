const logger = require("./../../infrastructure/logger");
const { getSingleServiceForUser, isUserManagement } = require("./utils");
const {
  listRolesOfService,
  updateUserService,
  updateInvitationService,
} = require("./../../infrastructure/access");
const config = require("./../../infrastructure/config");
const { NotificationClient } = require("login.dfe.jobs-client");
const {
  isServiceEmailNotificationAllowed,
} = require("./../../infrastructure/applications");

const renderConfirmEditServicePage = (req, res, model) => {
  const isManage = isUserManagement(req);
  res.render(
    `users/views/${isManage ? "confirmEditService" : "confirmEditServiceRedesigned"}`,
    { ...model, currentPage: isManage ? "users" : "services" },
  );
};

const buildBackLink = (req) => {
  let backRedirect = `/approvals/${req.params.orgId}/users/${req.params.uid}/services/${req.params.sid}`;
  if (isUserManagement(req)) {
    backRedirect += "?manage_users=true";
  }
  return backRedirect;
};

const getSelectedRoles = async (req) => {
  let selectedRoleIds = req.session.service.roles;
  const allRolesOfServiceUnsorted = await listRolesOfService(
    req.params.sid,
    req.id,
  );
  const allRolesOfService = allRolesOfServiceUnsorted.sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  let rotails;

  if (selectedRoleIds && !Array.isArray(selectedRoleIds)) {
    selectedRoleIds = [selectedRoleIds];
  }
  if (selectedRoleIds) {
    rotails = allRolesOfService.filter((x) =>
      selectedRoleIds.find((y) => y.toLowerCase() === x.id.toLowerCase()),
    );
  } else {
    rotails = [];
    selectedRoleIds = [];
  }
  return {
    rotails,
    selectedRoleIds,
  };
};

const get = async (req, res) => {
  if (!req.session.service || !req.session.user) {
    return res.redirect(`/approvals/users/${req.params.uid}`);
  }
  const userService = await getSingleServiceForUser(
    req.params.uid,
    req.params.orgId,
    req.params.sid,
    req.id,
  );
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find(
    (x) => x.organisation.id === organisationId,
  );
  const selectedRoles = await getSelectedRoles(req);

  const model = {
    csrfToken: req.csrfToken(),
    organisationDetails,
    currentPage: "users",
    backLink: buildBackLink(req),
    cancelLink: `/approvals/users/${req.params.uid}`,
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
    },
    roles: selectedRoles.rotails,
    service: userService,
  };

  renderConfirmEditServicePage(req, res, model);
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/users/${req.params.uid}`);
  }

  const uid = req.params.uid;
  const organisationId = req.params.orgId;
  const serviceId = req.params.sid;
  const isEmailAllowed = await isServiceEmailNotificationAllowed();
  const service = await getSingleServiceForUser(
    uid,
    organisationId,
    serviceId,
    req.id,
  );
  const selectedRoles = await getSelectedRoles(req);
  if (uid.startsWith("inv-")) {
    await updateInvitationService(
      uid.substr(4),
      serviceId,
      organisationId,
      selectedRoles.selectedRoleIds,
      req.id,
    );
  } else {
    await updateUserService(
      uid,
      serviceId,
      organisationId,
      selectedRoles.selectedRoleIds,
      req.id,
    );
    if (isEmailAllowed) {
      const notificationClient = new NotificationClient({
        connectionString: config.notifications.connectionString,
      });
      await notificationClient.sendServiceAdded(
        req.session.user.email,
        req.session.user.firstName,
        req.session.user.lastName,
      );
    }
  }

  logger.audit({
    type: "approver",
    subType: "user-service-updated",
    userId: req.user.sub,
    userEmail: req.user.email,
    organisationId,
    meta: {
      editedFields: [
        {
          name: "update_service",
          newValue: selectedRoles.selectedRoleIds,
        },
      ],
      editedUser: uid,
    },
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${req.user.email} updated service ${service.name} for user ${req.session.user.email}`,
  });

  res.flash("title", `Success`);
  res.flash("heading", `Service amended: ${service.name}`);

  if (!isUserManagement(req)) {
    res.flash(
      "message",
      `Select the service from the list below to access its functions and features.`,
    );
    res.redirect(`/my-services`);
  } else {
    res.flash(
      "message",
      `The user can now access its edited functions and features.`,
    );
    return res.redirect(`/approvals/users/${uid}`);
  }
};

module.exports = {
  get,
  post,
};
