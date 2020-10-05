'use strict';

const logger = require('./../../infrastructure/logger');
const { getSingleServiceForUser } = require('./utils');
const { removeServiceFromUser, removeServiceFromInvitation } = require('./../../infrastructure/access');
const { getById, updateIndex } = require('./../../infrastructure/search');
const { waitForIndexToUpdate } = require('./utils');
const config = require('./../../infrastructure/config');
const NotificationClient = require('login.dfe.notifications.client');
const { isServiceEmailNotificationAllowed } = require('./../../infrastructure/applications');

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users/${req.params.uid}`);
  }
  const service = await getSingleServiceForUser(req.params.uid, req.params.orgId, req.params.sid, req.id);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === organisationId);
  return res.render('users/views/removeService', {
    backLink: `/approvals/${req.params.orgId}/users/${req.params.uid}/services/${req.params.sid}`,
    cancelLink: `/approvals/${req.params.orgId}/users/${req.params.uid}/services`,
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    organisationDetails,
    service,
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
    },
  });
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users/${req.params.uid}`);
  }
  const uid = req.params.uid;
  const serviceId = req.params.sid;
  const organisationId = req.params.orgId;
  const service = await getSingleServiceForUser(uid, organisationId, serviceId, req.id);
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === organisationId);
  const org = organisationDetails.organisation.name;
  const isEmailAllowed = await isServiceEmailNotificationAllowed();

  if (uid.startsWith('inv-')) {
    await removeServiceFromInvitation(uid.substr(4), serviceId, organisationId, req.id);
  } else {
    await removeServiceFromUser(uid, serviceId, organisationId, req.id);
    if (isEmailAllowed) {
      const notificationClient = new NotificationClient({ connectionString: config.notifications.connectionString });
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
  const serviceRemoved = currentServiceDetails.findIndex((x) => x === serviceId);
  const updatedServiceDetails = currentServiceDetails.filter((_, index) => index !== serviceRemoved);
  await updateIndex(uid, null, null, updatedServiceDetails, req.id);
  await waitForIndexToUpdate(uid, (updated) => updated.services.length === updatedServiceDetails.length);

  logger.audit(
    {
      type: 'approver',
      subType: 'user-service-deleted',
      userId: req.user.sub,
      userEmail: req.user.email,
      editedUser: uid,
      editedFields: [
        {
          name: 'remove_service',
          oldValue: serviceId,
          newValue: undefined,
        },
      ],
      application: config.loggerSettings.applicationName,
      env: config.hostingEnvironment.env,
      message: `${req.user.email} (id: ${req.user.sub}) removed service ${service.name} for organisation ${org} (id: ${organisationId}) for user ${req.session.user.email} (id: ${uid})`,
    },
  );
  res.flash('info', `${service.name} successfully removed`);
  return res.redirect(`/approvals/${organisationId}/users/${uid}/services`);
};

module.exports = {
  get,
  post,
};
