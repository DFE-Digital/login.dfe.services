'use strict';

const uniqBy = require('lodash/uniqBy');
const sortBy = require('lodash/sortBy');
const config = require('../../infrastructure/config');
const { checkCacheForAllServices } = require('../../infrastructure/helpers/allServicesAppCache');

const getAndMapExternalServices = async (correlationId) => {
  const allServices = await checkCacheForAllServices(correlationId);

  const services = uniqBy(
    allServices.services.map((service) => ({
      id: service.id,
      name: service.name,
      isMigrated: service.isMigrated,
      isExternalService: service.isExternalService,
    })),
    'id',
  );
  return sortBy(services, 'name');
};

const displayEsfa = (externalServices) => {
  externalServices.map((service) => {
      if (service.name === 'Digital Forms service') {
          service.name = 'ESFA Digital Forms Service'
      }
      if (service.name === 'OPAFastForm') {
          service.name = 'ESFA Digital Forms Service'
      }
  });

  externalServices = sortBy(externalServices, 'name');
  externalServices = uniqBy(externalServices, obj => obj.name);
  return externalServices;
};

const home = async (req, res) => {
  let services = await getAndMapExternalServices(req.id);
  const sessionExpiryTime = config.hostingEnvironment.sessionCookieExpiryInMinutes || 20;

  services = displayEsfa(services);

  return res.render('home/views/landingPage', {
    title: 'DfE Sign-in',
    services,
    loggedOut: true,
    profileUrl: config.hostingEnvironment.profileUrl,
    helpUrl: config.hostingEnvironment.helpUrl,
    chatBotUrl: 'https://askonline.education.gov.uk/chatbot/davina?regional=true',
    sessionExpiryTime,
  });
};

module.exports = home;
