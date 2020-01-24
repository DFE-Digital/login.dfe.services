'use strict';

const { getAllServices } = require('./../../infrastructure/applications');
const uniqBy = require('lodash/uniqBy');
const sortBy = require('lodash/sortBy');
const config = require('./../../infrastructure/config');

const getAndMapExternalServices = async (correlationId) => {
  const allServices = await getAllServices(correlationId) || [];
   const services = uniqBy(allServices.services.map((service) => ({
    id: service.id,
    name: service.name,
    isMigrated: service.isMigrated,
    isExternalService: service.isExternalService,
    profileUrl: config.hostingEnvironment.profileUrl,

  })), 'id');
   return sortBy(services, 'name');
};

const home = async (req, res) => {
  const services = await getAndMapExternalServices(req.id);
  return res.render('home/views/landingPage', {
    title: 'DfE Sign-in',
    services,
    loggedOut: true,
  });
};

module.exports = home;
