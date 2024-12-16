"use strict";
const {
  putUserInOrganisation,
  putInvitationInOrganisation,
  getOrganisationAndServiceForUser,
} = require("./../../infrastructure/organisations");
const { getById, updateIndex } = require("./../../infrastructure/search");
const {
  isServiceEmailNotificationAllowed,
} = require("./../../infrastructure/applications");
const logger = require("./../../infrastructure/logger");
const { getUserDetails, waitForIndexToUpdate } = require("./utils");
const { mapRole } = require("./../../infrastructure/utils");
const config = require("./../../infrastructure/config");
const { NotificationClient } = require("login.dfe.jobs-client");

const get = async (req, res) => {
  const user = await getUserDetails(req);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find(
    (x) => x.organisation.id === organisationId,
  );
  const linkToUserDetailsPage = `/approvals/users/${req.params.uid}`;
  return res.render("users/views/editPermission", {
    csrfToken: req.csrfToken(),
    organisationDetails,
    currentPage: "users",
    backLink: linkToUserDetailsPage,
    cancelLink: linkToUserDetailsPage,
    validationMessages: {},
    user,
  });
};

const post = async (req, res) => {
  const user = await getUserDetails(req);
  const roleId = parseInt(req.body.selectedLevel);
  const roleName = mapRole(roleId).description;
  const uid = req.params.uid;
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find(
    (x) => x.organisation.id === organisationId,
  );
  const organisationName = organisationDetails.organisation.name;
  const isEmailAllowed = await isServiceEmailNotificationAllowed();

  if (uid.startsWith("inv-")) {
    await putInvitationInOrganisation(
      uid.substr(4),
      organisationId,
      roleId,
      req.id,
    );
  } else {
    const mngUserOrganisations = await getOrganisationAndServiceForUser(
      uid,
      req.id,
    );

    await putUserInOrganisation(uid, organisationId, 1, roleId, req.id);
    if (isEmailAllowed) {
      const mngUserOrganisationDetails = mngUserOrganisations.find(
        (x) => x.organisation.id === organisationId,
      );
      const mngUserOrgPermission = {
        id: roleId,
        name: roleName,
        oldName: mngUserOrganisationDetails.role.name,
      };
      const notificationClient = new NotificationClient({
        connectionString: config.notifications.connectionString,
      });

      await notificationClient.sendUserPermissionChanged(
        user.email,
        user.firstName,
        user.lastName,
        organisationName,
        mngUserOrgPermission,
      );
    }
  }
  // patch search indexer with new role
  const getAllUserDetails = await getById(uid, req.id);
  const allOrganisationDetails = getAllUserDetails.organisations;
  const updatedOrganisationDetails = allOrganisationDetails.map((org) => {
    if (org.id === organisationId) {
      return Object.assign({}, org, { roleId });
    }
    return org;
  });

  await updateIndex(uid, updatedOrganisationDetails, null, null, req.id);
  await waitForIndexToUpdate(
    uid,
    (updated) =>
      updated.organisations.find((x) => x.id === organisationId).roleId ===
      roleId,
  );

  logger.audit({
    type: "approver",
    subType: "user-org-permission-edited",
    userId: req.user.sub,
    userEmail: req.user.email,
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${req.user.email} (id: ${req.user.sub}) edited permission level to ${roleName.toLowerCase()} for org ${organisationDetails.organisation.name} (id: ${organisationId}) for user ${user.email} (id: ${uid})`,
    meta: {
      editedFields: [
        {
          name: "edited_permission",
          newValue: roleName,
        },
      ],
      editedUser: uid,
    },
  });
  res.flash("title", `Success`);
  res.flash(
    "heading",
    roleId === 10000
      ? `Permission level upgraded to approver`
      : `Permission level downgraded to end user`,
  );
  res.flash(
    "message",
    roleId === 10000
      ? `${user.firstName} ${user.lastName} is now an approver at ${organisationName}`
      : `${user.firstName} ${user.lastName} is now an end user at ${organisationName}`,
  );
  return res.redirect(`/approvals/users/${uid}`);
};

module.exports = {
  get,
  post,
};
