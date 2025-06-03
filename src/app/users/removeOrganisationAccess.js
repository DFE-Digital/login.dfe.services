const logger = require("./../../infrastructure/logger");
const config = require("./../../infrastructure/config");
const { NotificationClient } = require("login.dfe.jobs-client");
const {
  isServiceEmailNotificationAllowed,
} = require("./../../infrastructure/applications");
const { getAllServicesForUserInOrg, waitForIndexToUpdate } = require("./utils");
const {
  deleteUserOrganisation,
  deleteInvitationOrganisation,
  getOrganisationAndServiceForUser,
} = require("./../../infrastructure/organisations");
const {
  removeServiceFromUser,
  removeServiceFromInvitation,
} = require("./../../infrastructure/access");
const { getById, updateIndex } = require("./../../infrastructure/search");

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(
      `/approvals/${req.params.orgId}/users/${req.params.uid}`,
    );
  }

  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find(
    (x) => x.organisation.id === organisationId,
  );
  const servicesForUser = await getAllServicesForUserInOrg(
    req.params.uid,
    req.params.orgId,
    req.id,
  );
  const linkToUserDetailsPage = `/approvals/users/${req.params.uid}`;

  return res.render("users/views/removeOrganisation", {
    csrfToken: req.csrfToken(),
    organisationDetails,
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
    },
    currentPage: "users",
    backLink: linkToUserDetailsPage,
    cancelLink: linkToUserDetailsPage,
    services: servicesForUser,
  });
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/users/${req.params.uid}`);
  }

  const uid = req.params.uid;
  const organisationId = req.params.orgId;
  const servicesForUser = await getAllServicesForUserInOrg(
    uid,
    organisationId,
    req.id,
  );
  const getAllUserDetails = await getById(uid, req.id);
  const currentOrganisationDetails = getAllUserDetails.organisations;
  const isEmailAllowed = await isServiceEmailNotificationAllowed();
  var invitedUser = false;

  if (uid.startsWith("inv-")) {
    invitedUser = true;
    for (let i = 0; i < servicesForUser.length; i++) {
      const service = servicesForUser[i];
      await removeServiceFromInvitation(
        uid.substr(4),
        service.id,
        organisationId,
        req.id,
      );
    }
    await deleteInvitationOrganisation(uid.substr(4), organisationId);
  } else {
    var userOrgs = await getOrganisationAndServiceForUser(uid);
    for (let i = 0; i < servicesForUser.length; i++) {
      const service = servicesForUser[i];
      await removeServiceFromUser(uid, service.id, organisationId, req.id);
    }
    const organisation = currentOrganisationDetails.filter(
      (org) => org.id === organisationId,
    );
    await deleteUserOrganisation(uid, organisationId);
    if (isEmailAllowed && getAllUserDetails.statusId !== 0) {
      const notificationClient = new NotificationClient({
        connectionString: config.notifications.connectionString,
      });
      await notificationClient.sendUserRemovedFromOrganisation(
        req.session.user.email,
        req.session.user.firstName,
        req.session.user.lastName,
        organisation[0].name,
      );
    }
  }

  // patch search indexer to remove org
  const updatedOrganisationDetails = currentOrganisationDetails.filter(
    (org) => org.id !== organisationId,
  );
  await updateIndex(uid, updatedOrganisationDetails, null, null, req.id);
  await waitForIndexToUpdate(
    uid,
    (updated) =>
      updated.organisations.length === updatedOrganisationDetails.length,
  );
  const organisationDetails = req.userOrganisations.find(
    (x) => x.organisation.id === organisationId,
  );

  const numericIdentifierAndtextIdentifier = {};

  if (invitedUser) {
    var orgName = organisationDetails.organisation.name;
  } else {
    const deletedOrganisation = userOrgs.filter(
      (x) => x.organisation.id === organisationId,
    );
    orgName = organisationDetails.organisation.name;
    if (
      deletedOrganisation[0]?.["numericIdentifier"] &&
      deletedOrganisation[0]?.["textIdentifier"]
    ) {
      numericIdentifierAndtextIdentifier["numericIdentifier"] =
        deletedOrganisation[0]["numericIdentifier"];
      numericIdentifierAndtextIdentifier["textIdentifier"] =
        deletedOrganisation[0]["textIdentifier"];
    }
  }

  logger.audit({
    type: "approver",
    subType: "user-org-deleted",
    userId: req.user.sub,
    userEmail: req.user.email,
    editedUser: uid,
    meta: {
      editedFields: [
        {
          name: "new_organisation",
          oldValue: organisationId,
          newValue: undefined,
        },
      ],
      editedUser: uid,
      ...(Object.keys(numericIdentifierAndtextIdentifier).length !== 0 && {
        ...numericIdentifierAndtextIdentifier,
      }),
    },
    message: `${req.user.email} (id: ${req.user.sub}) removed organisation ${orgName} (id: ${organisationId}) for user ${
      req.session.user.email
    } (id: ${uid}) numeric Identifier and textIdentifier(${
      Object.keys(numericIdentifierAndtextIdentifier).length === 0
        ? "null"
        : JSON.stringify(numericIdentifierAndtextIdentifier)
    })`,
    ...(Object.keys(numericIdentifierAndtextIdentifier).length !== 0 && {
      ...numericIdentifierAndtextIdentifier,
    }),
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
  });
  res.flash("title", `Success`);
  res.flash(
    "heading",
    `${req.session.user.firstName} ${req.session.user.lastName} removed from organisation`,
  );
  res.flash(
    "message",
    `${req.session.user.firstName} ${req.session.user.lastName} no longer has access to ${orgName}`,
  );
  return res.redirect(`/approvals/users`);
};

module.exports = {
  get,
  post,
};
