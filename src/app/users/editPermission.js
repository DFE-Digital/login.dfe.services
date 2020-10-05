'use strict';
const { putUserInOrganisation, putInvitationInOrganisation } = require('./../../infrastructure/organisations');
const { getById, updateIndex } = require('./../../infrastructure/search');
const { isServiceEmailNotificationAllowed } = require('./../../infrastructure/applications');
const logger = require('./../../infrastructure/logger');
const { getUserDetails, waitForIndexToUpdate } = require('./utils');
const config = require('./../../infrastructure/config');
const NotificationClient = require('login.dfe.notifications.client');

const get = async (req, res) => {
  const user = await getUserDetails(req);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === organisationId);
  return res.render('users/views/editPermission', {
    csrfToken: req.csrfToken(),
    organisationDetails,
    currentPage: 'users',
    backLink: 'services',
    validationMessages: {},
    user,
  });
};

const post = async (req, res) => {
  const user = await getUserDetails(req);
  const role = parseInt(req.body.selectedLevel);
  const uid = req.params.uid;
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === organisationId);
  const organisationName = organisationDetails.organisation.name;
  const permissionName = role === 10000 ? 'approver' : 'end user';
  const isEmailAllowed = await isServiceEmailNotificationAllowed();

  if (uid.startsWith('inv-')) {
    await putInvitationInOrganisation(uid.substr(4), organisationId, role, req.id);
  } else {
    await putUserInOrganisation(uid, organisationId, 1, role, req.id);
    if (isEmailAllowed) {
      const notificationClient = new NotificationClient({ connectionString: config.notifications.connectionString });
      await notificationClient.sendUserPermissionChanged(
        user.email,
        user.firstName,
        user.lastName,
        organisationName,
        permissionName,
      );
    }
  }
  // patch search indexer with new role
  const getAllUserDetails = await getById(uid, req.id);
  const allOrganisationDetails = getAllUserDetails.organisations;
  const updatedOrganisationDetails = allOrganisationDetails.map((org) => {
    if (org.id === organisationId) {
      return Object.assign({}, org, { roleId: role });
    }
    return org;
  });

  await updateIndex(uid, updatedOrganisationDetails, null, null, req.id);
  await waitForIndexToUpdate(
    uid,
    (updated) => updated.organisations.find((x) => x.id === organisationId).roleId === role,
  );

  logger.audit(
    {
      type: 'approver',
      subType: 'user-org-permission-edited',
      userId: req.user.sub,
      userEmail: req.user.email,
      editedUser: uid,
      editedFields: [
        {
          name: 'edited_permission',
          newValue: permissionName,
        },
      ],
      application: config.loggerSettings.applicationName,
      env: config.hostingEnvironment.env,
      message: `${req.user.email} (id: ${req.user.sub}) edited permission level to ${permissionName} for org ${organisationDetails.organisation.name} (id: ${organisationId}) for user ${user.email} (id: ${uid})`,
    },
  );
  res.flash('info', role === 10000 ? `${user.email} now has approver access` : `${user.email} now has end user access`);
  return res.redirect(`/approvals/${organisationId}/users/${uid}/services`);
};

module.exports = {
  get,
  post,
};
