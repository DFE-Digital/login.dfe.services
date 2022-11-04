'use strict';
const { isServiceEmailNotificationAllowed } = require('./../../infrastructure/applications');
const { listRolesOfService, addInvitationService, addUserService } = require('./../../infrastructure/access');
const {
  putUserInOrganisation,
  putInvitationInOrganisation,
  getOrganisationById,
  getPendingRequestsAssociatedWithUser,
  getOrganisationAndServiceForInvitation,
  getOrganisationAndServiceForUser,
  updateRequestById,
} = require('./../../infrastructure/organisations');
const { getById, updateIndex, createIndex } = require('./../../infrastructure/search');
const { mapRole } = require('./../../infrastructure/utils');
const { waitForIndexToUpdate, isSelfManagement } = require('./utils');
const Account = require('./../../infrastructure/account');
const logger = require('./../../infrastructure/logger');
const config = require('./../../infrastructure/config');
const NotificationClient = require('login.dfe.notifications.client');
const { checkCacheForAllServices } = require('./../../infrastructure/helpers/allServicesAppCache');
const { actions } = require('../constans/actions');

const renderConfirmNewUserPage = (req, res, model) => {
  const isSelfManage = isSelfManagement(req);
  res.render(
    `users/views/${isSelfManage ? "confirmNewUserRedesigned" : "confirmNewUser" }`,
    { ...model, currentPage: isSelfManage? "services": "users" }
  );
};

const buildBackLink = (req, services) => {
  let backRedirect = `/approvals/${req.params.orgId}/users`;
  if (req.params.uid) {
    backRedirect += `/${req.params.uid}`;
  }
  backRedirect += `/associate-services`;
  if (services.length > 0) {
    // go back to previous select role page for previous service as we had multi-select for services
    backRedirect += `/${services[services.length - 1].id}`;
  }
  return backRedirect;
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/approvals/users');
  }

  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === req.params.orgId);
  const services = req.session.user.services.map((service) => ({
    id: service.serviceId,
    name: '',
    roles: service.roles,
  }));

  const orgRole = parseInt(req.session.user.permission);
  const orgPermissionName = mapRole(orgRole).description;

  const allServices = await checkCacheForAllServices(req.id);
  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    const serviceDetails = allServices.services.find((x) => x.id === service.id);
    const allRolesOfService = await listRolesOfService(service.id, req.id);
    const rotails = allRolesOfService.filter((x) =>
      service.roles.find((y) => y.toLowerCase() === x.id.toLowerCase()),
    );
    service.name = serviceDetails.name;
    service.roles = rotails;
  }

  let serviceUrl = ''
  let subServiceUrl = ''
  if (!req.session.user.isInvite) {
    subServiceUrl = `/approvals/${req.params.orgId}/users/${req.params.uid}/associate-services/${services[0].id}?action=${actions.MANAGE_SERVICE}`;
    serviceUrl = `/approvals/${req.params.orgId}/users/${req.params.uid}/associate-services?action=${actions.MANAGE_SERVICE}`;
  }

  const model = {
    backLink: buildBackLink(req, services),
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
    subServiceUrl,
    serviceUrl,
    organisationDetails,
    orgPermissionName,
  };

  renderConfirmNewUserPage(req, res, model);
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/approvals/users');
  }
  if (!req.userOrganisations) {
    logger.warn('No req.userOrganisations on post of confirmNewUser');
    return res.redirect('/approvals/users');
  }

  let uid = req.params.uid;
  const organisationId = req.params.orgId;
  const organisation = await getOrganisationById(organisationId, req.id);
  const isEmailAllowed = await isServiceEmailNotificationAllowed();

  if (!uid) {
    const isApprover = req.session.user.permission === 10000;
    const redirectUri = `https://${config.hostingEnvironment.host}/auth`;
    const invitationId = await Account.createInvite(
      req.session.user.firstName,
      req.session.user.lastName,
      req.session.user.email,
      'services',
      redirectUri,
      req.user.email,
      organisation.name,
      isApprover,
    );
    uid = `inv-${invitationId}`;
  }

  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === organisationId);
  const org = organisationDetails.organisation.name;
  // existing invitation or new invite
  const invitationId = uid.startsWith('inv-') ? uid.substr(4) : undefined;

  if (req.session.user.isInvite) {
    if (invitationId) {
      await putInvitationInOrganisation(invitationId, organisationId, req.session.user.permission, req.id);
    } else {
      await putUserInOrganisation(uid, organisationId, 0, req.session.user.permission, req.id);
    }
  }

  const mngUserOrganisations = invitationId
    ? await getOrganisationAndServiceForInvitation(invitationId, req.id)
    : await getOrganisationAndServiceForUser(uid, req.id);
  const mngUserOrganisationDetails = mngUserOrganisations.find((x) => x.organisation.id === organisation.id);
  const mngUserOrgPermission = {
    id: mngUserOrganisationDetails.role.id,
    name: mngUserOrganisationDetails.role.name,
  };
  const notificationClient = new NotificationClient({ connectionString: config.notifications.connectionString });

  // if existing user not in org
  if (!invitationId) {
    if (req.session.user.isInvite) {
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
  }

  if (req.session.user.services) {
    for (let i = 0; i < req.session.user.services.length; i++) {
      const service = req.session.user.services[i];
      const allServices = await checkCacheForAllServices(req.id);
      const serviceDetails = allServices.services.find((x) => x.id === service.serviceId);
      const allRolesOfService = await listRolesOfService(service.serviceId, req.id);
      const roleDetails = allRolesOfService.filter((x) =>
        service.roles.find((y) => y.toLowerCase() === x.id.toLowerCase()),
      );

      if (invitationId) {
        await addInvitationService(invitationId, service.serviceId, organisationId, service.roles, req.id);
      } else {
        await addUserService(uid, service.serviceId, organisationId, service.roles, req.id);
      }

      await notificationClient.sendServiceRequestApproved(
        req.session.user.email,
        req.session.user.firstName,
        req.session.user.lastName,
        org,
        serviceDetails.name,
        roleDetails.map((i) => i.name),
        mngUserOrgPermission,
      );
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
          roleId: req.session.user.permission,
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
    logger.audit({
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
    });

    res.flash('title', `Success`);
    res.flash(
      'heading',
      req.params.uid
        ? `${req.session.user.firstName} ${req.session.user.lastName} added to organisation`
        : `Invitation email sent`,
    );
    res.flash(
      'message',
      req.params.uid
        ? `${req.session.user.firstName} ${req.session.user.lastName} has been successfully added to ${org}`
        : `Invitation email sent to: ${req.session.user.email}`,
    );
    res.redirect(`/approvals/users`);
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
    logger.audit({
      type: 'approver',
      subType: 'user-services-added',
      userId: req.user.sub,
      userEmail: req.user.email,
      application: config.loggerSettings.applicationName,
      env: config.hostingEnvironment.env,
      message: `${req.user.email} (id: ${req.user.sub}) added services for organisation ${org} (id: ${organisationId}) for user ${req.session.user.email} (id: ${uid})`,
      meta: {
        editedFields: [
          {
            name: 'add_services',
            newValue: req.session.user.services,
          },
        ],
        editedUser: uid,
      },
    });

    if (req.session.user.isInvite) {
      res.flash('info', 'Services successfully added');
      res.redirect(`/approvals/users/${req.session.user.uid}`);
    } else {
      const allServices = await checkCacheForAllServices();
      const serviceDetails = allServices.services.find((x) => x.id === req.session.user.services[0].serviceId);

      res.flash('title', `Success`);
      res.flash('heading', `New service added: ${serviceDetails.name}`);

      if (isSelfManagement(req)) {
        res.flash('message', `Select the service from the list below to access its functions and features.`);
        res.redirect(`/my-services`);
      } else {
        res.flash('message', `The user can now access its functions and features.`);
        res.redirect(`/approvals/users/${req.session.user.uid}`);
      }
    }
  }
};

module.exports = {
  get,
  post,
};
