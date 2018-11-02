'use strict';
const { getServicesForUser } = require('./../../infrastructure/access');
const { getApplication } = require('./../../infrastructure/applications');
const sortBy = require('lodash/sortBy');

const getAllServicesForUserInOrg = async (userId, organisationId, correlationId) => {
  const allUserServices = (await getServicesForUser(userId, correlationId)) || [];
  const userServicesForOrg = allUserServices.filter(x => x.organisationId === organisationId);
  const services = userServicesForOrg.map((service) => ({
    id: service.serviceId,
    dateActivated: service.accessGrantedOn,
    name: '',
    lastLogin: null,
    status: null,
  }));
  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    const application = await getApplication(service.id);
    service.name = application.name;
  }
  return sortBy(services, 'name');
};


const action = async (req, res) => {
  const organisationId = req.params.orgId;
  const organisationDetails = req.user.organisations.filter(x => x.organisation.id === organisationId);
  const servicesForUser = await getAllServicesForUserInOrg(req.params.uid, req.params.orgId, req.id);

  return res.render('users/views/services', {
    backLink: 'users-list',
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    organisation: organisationDetails,
    services: servicesForUser,
  });
};

module.exports = action;
