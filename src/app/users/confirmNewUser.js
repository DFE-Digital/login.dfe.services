'use strict';
const { getAllServices, isServiceEmailNotificationAllowed } = require('./../../infrastructure/applications');
const { listRolesOfService, addInvitationService, addUserService } = require('./../../infrastructure/access');
const {
  putUserInOrganisation,
  putInvitationInOrganisation,
  getOrganisationById,
  getPendingRequestsAssociatedWithUser,
  updateRequestById,
} = require('./../../infrastructure/organisations');
const { getById, updateIndex, createIndex } = require('./../../infrastructure/search');
const { waitForIndexToUpdate } = require('./utils');
const Account = require('./../../infrastructure/account');
const logger = require('./../../infrastructure/logger');
const config = require('./../../infrastructure/config');
const NotificationClient = require('login.dfe.notifications.client');

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users`);
  }

  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === req.params.orgId);
  const services = req.session.user.services.map((service) => ({
    id: service.serviceId,
    name: '',
    roles: service.roles,
  }));

  const allServices = await getAllServices(req.id);
  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    const serviceDetails = allServices.services.find((x) => x.id === service.id);
    const allRolesOfService = await listRolesOfService(service.id, req.id);
    const roleDetails = allRolesOfService.filter((x) =>
      service.roles.find((y) => y.toLowerCase() === x.id.toLowerCase()),
    );
    service.name = serviceDetails.name;
    service.roles = roleDetails;
  }
  return res.render('users/views/confirmNewUser', {
    backLink: true,
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
      isInvite: req.session.user.isInvite ? req.session.user.isInvite : false,
      uid: req.session.user.uid ? req.session.user.uid : '',
    },
    services,
    organisationDetails,
  });
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users`);
  }
  if (!req.userOrganisations) {
    logger.warn('No req.userOrganisations on post of confirmNewUser');
    return res.redirect(`/approvals/${req.params.orgId}/users`);
  }

  let uid = req.params.uid;
  const organisationId = req.params.orgId;
  const organisation = await getOrganisationById(organisationId, req.id);
  const isEmailAllowed = await isServiceEmailNotificationAllowed();
  if (!uid) {
    const redirectUri = `https://${config.hostingEnvironment.host}/auth`;
    const invitationId = await Account.createInvite(
      req.session.user.firstName,
      req.session.user.lastName,
      req.session.user.email,
      'services',
      redirectUri,
      req.user.email,
      organisation.name,
    );
    uid = `inv-${invitationId}`;
  }

  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === organisationId);
  const org = organisationDetails.organisation.name;

  //if existing invitation or new invite
  if (uid.startsWith('inv-')) {
    const invitationId = uid.substr(4);
    if (req.session.user.isInvite) {
      await putInvitationInOrganisation(invitationId, organisationId, 0, req.id);
    }
    if (req.session.user.services) {
      for (let i = 0; i < req.session.user.services.length; i++) {
        const service = req.session.user.services[i];
        await addInvitationService(invitationId, service.serviceId, organisationId, service.roles, req.id);
      }
    }
  } else {
    //if existing user not in org
    const notificationClient = new NotificationClient({ connectionString: config.notifications.connectionString });
    if (req.session.user.isInvite) {
      await putUserInOrganisation(uid, organisationId, 0, req.id);
      const pendingOrgRequests = await getPendingRequestsAssociatedWithUser(uid, req.id);
      const requestForOrg = pendingOrgRequests.find((x) => x.org_id === organisationId);
      if (requestForOrg) {
        // mark request as approved if outstanding for same org
        await updateRequestById(requestForOrg.id, 1, req.user.sub, null, Date.now(), req.id);
      }
      if (isEmailAllowed) {
        await notificationClient.sendUserAddedToOrganisation(
          req.session.user.email,
          req.session.user.firstName,
          req.session.user.lastName,
          org,
        );
      }
    }
    if (req.session.user.services) {
      for (let i = 0; i < req.session.user.services.length; i++) {
        const service = req.session.user.services[i];
        await addUserService(uid, service.serviceId, organisationId, service.roles, req.id);
      }
      if (req.session.user.services.length > 0) {
        if (isEmailAllowed) {
          await notificationClient.sendServiceAdded(
            req.session.user.email,
            req.session.user.firstName,
            req.session.user.lastName,
          );
        }
      }
    }
  }

  if (req.session.user.isInvite) {
    if (req.params.uid) {
      // patch search index with organisation added to existing user or inv
      const getAllUserDetails = await getById(req.params.uid, req.id);
      if (!getAllUserDetails) {
        logger.error(`Failed to find user ${req.params.uid} when confirming change of user permissions`, {
          correlationId: req.id,
        });
      } else if (!organisation) {
        logger.error(`Failed to find organisation ${organisationId} when confirming change of user permissions`, {
          correlationId: req.id,
        });
      } else {
        const currentOrganisationDetails = getAllUserDetails.organisations;
        const newOrgDetails = {
          id: organisation.id,
          name: organisation.name,
          urn: organisation.urn || undefined,
          uid: organisation.uid || undefined,
          establishmentNumber: organisation.establishmentNumber || undefined,
          laNumber: organisation.localAuthority ? organisation.localAuthority.code : undefined,
          categoryId: organisation.category.id,
          statusId: organisation.status.id,
          roleId: 0,
        };
        currentOrganisationDetails.push(newOrgDetails);
        await updateIndex(req.params.uid, currentOrganisationDetails, null, req.id);
        await waitForIndexToUpdate(
          req.params.uid,
          (updated) => updated.organisations.length === currentOrganisationDetails.length,
        );
      }
    } else {
      // post new inv to search index
      const createUserIndex = await createIndex(uid, req.id);
      if (!createUserIndex) {
        logger.error(`Failed to create user in index ${uid}`, { correlationId: req.id });
      }
      await waitForIndexToUpdate(uid);
    }
    //audit invitation
    logger.audit(
      {
        type: 'approver',
        subType: 'user-invited',
        userId: req.user.sub,
        userEmail: req.user.email,
        invitedUserEmail: req.session.user.email,
        invitedUser: uid,
        organisationid: organisationId,
        application: config.loggerSettings.applicationName,
        env: config.hostingEnvironment.env,
        message: `${req.user.email} (id: ${req.user.sub}) invited ${req.session.user.email} to ${org} (id: ${organisationId}) (id: ${uid})`,
      },
    );

    res.flash(
      'info',
      req.params.uid
        ? `User ${req.session.user.email} added to organisation`
        : `Invitation email sent to ${req.session.user.email}`,
    );
    res.redirect(`/approvals/${organisationId}/users`);
  } else {
    const getAllUserDetails = await getById(uid, req.id);
    if (!getAllUserDetails) {
      logger.error(`Failed to find user ${uid} when confirming change of user services`, { correlationId: req.id });
    } else {
      let currentUserServices = getAllUserDetails.services || [];
      const newServices = req.session.user.services.map((x) => x.serviceId);
      currentUserServices = currentUserServices.concat(newServices);
      await updateIndex(uid, null, null, currentUserServices, req.id);
      await waitForIndexToUpdate(uid, (updated) => updated.services.length === currentUserServices.length);
    }
    // audit add services to existing user
    logger.audit(
      {
        type: 'approver',
        subType: 'user-services-added',
        userId: req.user.sub,
        userEmail: req.user.email,
        editedUser: uid,
        editedFields: [
          {
            name: 'add_services',
            newValue: req.session.user.services,
          },
        ],
        application: config.loggerSettings.applicationName,
        env: config.hostingEnvironment.env,
        message: `${req.user.email} (id: ${req.user.sub}) added services for organisation ${org} (id: ${organisationId}) for user ${req.session.user.email} (id: ${uid})`,
      },
    );

    res.flash('info', `Services successfully added`);
    res.redirect(`/approvals/${organisationId}/users/${req.session.user.uid}/services`);
  }
};

module.exports = {
  get,
  post,
};
