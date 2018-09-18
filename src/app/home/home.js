'use strict';

const { getServicesForUser } = require('./../../infrastructure/access');
const { getApplication } = require('./../../infrastructure/applications');
const Account = require('./../../infrastructure/account');
const uniqBy = require('lodash/uniqBy');
const sortBy = require('lodash/sortBy');


const getAndMapServices = async (account, correlationId) => {
  const serviceAccess = (await getServicesForUser(account.id, correlationId)) || [];
  const services = uniqBy(serviceAccess.map((sa) => ({
    id: sa.serviceId,
    name: '',
    serviceUrl: '',
  })), 'id');
  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    const application = await getApplication(service.id);
    service.name = application.name;
    service.serviceUrl = (application.relyingParty ? (application.relyingParty.service_home || application.relyingParty.redirect_uris[0]) : undefined) || '#';
  }
  return sortBy(services, 'name');
};

const home = async (req, res) => {
  const account = Account.fromContext(req.user);
  const services = await getAndMapServices(account, req.id);

  return res.render('home/views/home', {
    title: 'Access DfE services',
    user: account,
    services,
    currentPage: 'services'
  });
};

module.exports = home;
