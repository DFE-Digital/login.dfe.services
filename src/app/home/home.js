'use strict';

const { getAllServices } = require('./../../infrastructure/applications');
const Account = require('./../../infrastructure/account');
const uniqBy = require('lodash/uniqBy');
const sortBy = require('lodash/sortBy');


const getAndMapExternalServices = async (correlationId) => {
  const allServices = await getAllServices(correlationId) || [];
   const services = uniqBy(allServices.services.map((service) => ({
    id: service.id,
    name: service.name,
    serviceUrl: (service.relyingParty ? (service.relyingParty.service_home || service.relyingParty.redirect_uris[0]): undefined) || '#',
    isMigrated: service.isMigrated,
    isExternalService: service.isExternalService,
    description: service.description,
  })), 'id');
   return sortBy(services, 'name');
};

const home = async (req, res) => {
  const services = await getAndMapExternalServices(req.id);
  return res.render('home/views/externalServices', {
    title: 'Access DfE services',
    services,
    loggedOut: true,
  });
};

module.exports = home;
