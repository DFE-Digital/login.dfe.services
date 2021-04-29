'use strict';

const { getAllServices } = require('./../../infrastructure/applications');
const uniqBy = require('lodash/uniqBy');
const sortBy = require('lodash/sortBy');
const config = require('../../infrastructure/config');
const appCache = require('../../infrastructure/helpers/AppCache');
const logger = require('../../infrastructure/logger/index');

const getAndMapExternalServices = async (correlationId) => {
  const allServices = (await getAllServices(correlationId)) || [];
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

const home = async (req, res) => {
  const allServicesId = 'allServices';
  let services = appCache.retrieve(allServicesId);

  if (!services) {
    services = await getAndMapExternalServices(req.id);
    appCache.save(allServicesId, services);
    logger.info(`Adding ${allServicesId} to cache`);
  } else {
    logger.info(`${allServicesId} available in the cache`);
  }

  const requestOrganisationToggle = config.toggles.useRequestOrganisation
    ? config.toggles.useRequestOrganisation
    : false;
  return res.render('home/views/landingPage', {
    title: 'DfE Sign-in',
    services,
    loggedOut: true,
    profileUrl: config.hostingEnvironment.profileUrl,
    requestOrganisationToggle,
  });
};

module.exports = home;
