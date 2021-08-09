'use strict';
const { listRolesOfService } = require('../../infrastructure/access');
const logger = require('../../infrastructure/logger');
const config = require('../../infrastructure/config');

const NotificationClient = require('login.dfe.notifications.client');
const notificationClient = new NotificationClient({
  connectionString: config.notifications.connectionString,
});

const { checkCacheForAllServices } = require('../../infrastructure/helpers/allServicesAppCache');

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
  )

  const rolesIds = roles.map(i => i.id) || []
  const roleNames = roles.map(i => i.name)
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === req.params.orgId)
  const senderName = `${req.session.user.firstName} ${req.session.user.lastName}`
  const senderEmail = req.session.user.email

  const baseUrl = `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`;
  
  const approveUrl = `${baseUrl}/request-service/${organisationDetails.organisation.id}/users/${req.session.user.uid}/services/${serviceDetails.id}/roles/${encodeURIComponent(JSON.stringify(rolesIds))}/approve`
  const rejectUrl = `${baseUrl}/request-service/${organisationDetails.organisation.id}/users/${req.session.user.uid}/services/${serviceDetails.id}/roles/${encodeURIComponent(JSON.stringify(rolesIds))}/reject`

  const helpUrl = `${baseUrl}/approvers`;

  await notificationClient.sendServiceRequestToApprovers(
    senderName,
    senderEmail,
    organisationDetails.organisation.id,
    organisationDetails.organisation.name,
    serviceDetails.name,
    roleNames,
    rejectUrl,
    approveUrl,
    helpUrl
  )

  logger.audit({
    type: 'services',
    subType: 'access-request',
    userId: req.session.user.uid,
    userEmail: senderEmail,
    application: config.loggerSettings.applicationName,
    env: config.hostingEnvironment.env,
    message: `${senderEmail} (userId: ${req.session.user.uid}) requested service (serviceId: ${serviceDetails.id}) and roles (roleIds: ${JSON.stringify(rolesIds)}) for organisation (orgId: ${organisationDetails.organisation.id})`,
  });

  res.flash('title', `Success`);
  res.flash('heading', `Service requested: ${serviceDetails.name}`);
  res.flash('message', `Your request has been sent to all approvers at <b>${organisationDetails.organisation.name}</b>. Requests should be approved or rejected within 5 days of being raised.`);

  res.redirect(`/my-services`);
};

module.exports = {
  get,
  post,
};
