'use strict';
const { isServiceEmailNotificationAllowed } = require('../../infrastructure/applications');
const { listRolesOfService, addInvitationService, addUserService } = require('../../infrastructure/access');
const {
  putUserInOrganisation,
  putInvitationInOrganisation,
  getOrganisationById,
  getPendingRequestsAssociatedWithUser,
  updateRequestById,
} = require('../../infrastructure/organisations');
const { getById, updateIndex, createIndex } = require('../../infrastructure/search');
const { waitForIndexToUpdate, isSelfManagement } = require('../users/utils');
const Account = require('../../infrastructure/account');
const logger = require('../../infrastructure/logger');
const config = require('../../infrastructure/config');
const NotificationClient = require('login.dfe.notifications.client');
const notificationClient = new NotificationClient({
  connectionString: config.notifications.connectionString,
});

const { checkCacheForAllServices } = require('../../infrastructure/helpers/allServicesAppCache');

const { getApproversDetails } = require('../../infrastructure/helpers/common');

const renderConfirmNewUserPage = (req, res, model) => {
  res.render('requestService/views/confirmServiceRequest', model);
};

const buildBackLink = (req, services) => {
  let backRedirect = `/request-service/${req.session.user.organisation}/users/${req.user.sub}/services/${services[0].id}`;
  return backRedirect;
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/my-services');
  }

  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === req.params.orgId);
  const services = req.session.user.services.map((service) => ({
    id: service.serviceId,
    name: '',
    roles: service.roles,
  }));

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

  const model = {
    backLink: buildBackLink(req, services),
    currentPage: 'services',
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
  };

  renderConfirmNewUserPage(req, res, model);
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/my-services');
  }
  if (!req.userOrganisations) {
    logger.warn('No req.userOrganisations on post of confirmNewUser');
    return res.redirect('/my-services');
  }
  const allServices = await checkCacheForAllServices();
  const serviceDetails = allServices.services.find((x) => x.id === req.session.user.services[0].serviceId);
  
  const allRolesOfService = await listRolesOfService(serviceDetails.id, req.id);
  const roles = allRolesOfService.filter((x) =>
      req.session.user.services[0].roles.find((y) => y.toLowerCase() === x.id.toLowerCase()),
  );
  const rolesIds = roles.map(i => i.id) || []
  const roleNames = roles.map(i => i.name)
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === req.params.orgId)
  const selectedOrg = req.userOrganisations.find((x) => x.organisation.id === req.session.user.organisation)
  const allApprovers =  await getApproversDetails([selectedOrg])
  const senderName = req.session.user.firstName + req.session.user.lastName
  const senderEmail = req.session.user.email

  res.flash('title', `Success`);
  res.flash('heading', `Service requested: ${serviceDetails.name}`);
  res.flash('message', `Your request has been sent to all approvers at `);
  res.flash('message1', `${organisationDetails.organisation.name}`);
  res.flash('message2', `. Requests should be approved or rejected within 5 days of being raised.`);

  res.redirect(`/my-services`);
};

module.exports = {
  get,
  post,
};
