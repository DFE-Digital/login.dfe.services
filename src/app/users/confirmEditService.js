'use strict';
const logger = require('./../../infrastructure/logger');
const { getSingleServiceForUser } = require('./utils');
const { listRolesOfService, updateUserService, updateInvitationService } = require('./../../infrastructure/access');
const config = require('./../../infrastructure/config');
const NotificationClient = require('login.dfe.notifications.client');
const { isServiceEmailNotificationAllowed } = require('./../../infrastructure/applications');

const getSelectedRoles = async (req) => {
  let selectedRoleIds = req.session.service.roles;
  const allRolesOfService = await listRolesOfService(req.params.sid, req.id);
  let roleDetails;

  if (selectedRoleIds && !Array.isArray(selectedRoleIds)) {
    selectedRoleIds = [selectedRoleIds];
  }
  if (selectedRoleIds) {
    roleDetails = allRolesOfService.filter((x) => selectedRoleIds.find((y) => y.toLowerCase() === x.id.toLowerCase()));
  } else {
    roleDetails = [];
    selectedRoleIds = [];
  }
  return {
    roleDetails,
    selectedRoleIds,
  };
};

const get = async (req, res) => {
  if (!req.session.service || !req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users/${req.params.uid}`);
  }
  const userService = await getSingleServiceForUser(req.params.uid, req.params.orgId, req.params.sid, req.id);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === organisationId);
  const selectedRoles = await getSelectedRoles(req);
  return res.render('users/views/confirmEditService', {
    csrfToken: req.csrfToken(),
    organisationDetails,
    currentPage: 'users',
    backLink: `/approvals/${req.params.orgId}/users/${req.params.uid}/services/${req.params.sid}`,
    cancelLink: `/approvals/${req.params.orgId}/users/${req.params.uid}/services`,
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
    },
    roles: selectedRoles.roleDetails,
    service: userService,
  });
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users/${req.params.uid}`);
  }
  const uid = req.params.uid;
  const organisationId = req.params.orgId;
  const serviceId = req.params.sid;
  const isEmailAllowed = await isServiceEmailNotificationAllowed();
  const service = await getSingleServiceForUser(uid, organisationId, serviceId, req.id);
  const selectedRoles = await getSelectedRoles(req);
  if (uid.startsWith('inv-')) {
    await updateInvitationService(uid.substr(4), serviceId, organisationId, selectedRoles.selectedRoleIds, req.id);
  } else {
    await updateUserService(uid, serviceId, organisationId, selectedRoles.selectedRoleIds, req.id);
    if (isEmailAllowed) {
      const notificationClient = new NotificationClient({ connectionString: config.notifications.connectionString });
      await notificationClient.sendServiceAdded(
        req.session.user.email,
        req.session.user.firstName,
        req.session.user.lastName,
      );
    }
  }

  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === organisationId);
  const org = organisationDetails.organisation.name;
  logger.audit(
    {
      type: 'approver',
      subType: 'user-service-updated',
      userId: req.user.sub,
      userEmail: req.user.email,
      editedUser: uid,
      editedFields: [
        {
          name: 'update_service',
          newValue: selectedRoles.selectedRoleIds,
        },
      ],
      application: config.loggerSettings.applicationName,
      env: config.hostingEnvironment.env,
      message: `${req.user.email} (id: ${req.user.sub}) updated service ${service.name} for organisation ${org} (id: ${organisationId}) for user ${req.session.user.email} (id: ${uid})`,
    },
  );

  res.flash('info', `${service.name} updated successfully`);
  return res.redirect(`/approvals/${organisationId}/users/${uid}/services`);
};

module.exports = {
  get,
  post,
};
