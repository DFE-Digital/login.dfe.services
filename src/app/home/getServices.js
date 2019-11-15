'use strict';
const { getServicesForUser } = require('./../../infrastructure/access');
const { getApplication } = require('./../../infrastructure/applications');
const Account = require('./../../infrastructure/account');
const uniqBy = require('lodash/uniqBy');
const sortBy = require('lodash/sortBy');

const getAndMapServices = async (account, correlationId) => {
  const serviceAccess = (await getServicesForUser(account.id, correlationId)) || [];
  const services = serviceAccess.map((sa) => ({
    id: sa.serviceId,
    name: '',
    serviceUrl: '',
    roles: sa.roles,
  }));
  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    if (service && !service.isRole) {
      const application = await getApplication(service.id);
      if (application.relyingParty && application.relyingParty.params && application.relyingParty.params.showRolesOnServices === 'true') {
        for (let r = 0; r < service.roles.length; r++) {
          const role = service.roles[r];
          services.push({
            id: role.id,
            name: role.name,
            serviceUrl: application.relyingParty && application.relyingParty.params && application.relyingParty.params[role.code] ? application.relyingParty.params[role.code] : '',
            isRole: true,
          })
        }
        service.hideService = true;
      } else {
        service.name = application.name;
        service.serviceUrl = (application.relyingParty ? (application.relyingParty.service_home || application.relyingParty.redirect_uris[0]) : undefined) || '#';
      }
    }
  }
  return sortBy(services, 'name');
};

const getServices = async (req, res) => {
  const account = Account.fromContext(req.user);
  const allServices = await getAndMapServices(account, req.id);
  const services = uniqBy(allServices.filter(x => !x.hideService), 'id');
  const approverRequests = req.organisationRequests || [];

  return res.render('home/views/services', {
    title: 'Access DfE services',
    user: account,
    services,
    currentPage: 'services',
    approverRequests,
  });
};

module.exports = getServices;
