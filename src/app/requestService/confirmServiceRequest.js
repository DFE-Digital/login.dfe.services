'use strict';
const { listRolesOfService } = require('../../infrastructure/access');
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
   //WIP
  res.redirect(`/my-services`);
};

module.exports = {
  get,
  post,
};
