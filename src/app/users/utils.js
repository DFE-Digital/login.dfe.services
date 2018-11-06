'use strict';
const { getById } = require('./../../infrastructure/search');
const { mapUserStatus } = require('./../../infrastructure/utils');
const { getServicesForUser, getServicesForInvitation } = require('./../../infrastructure/access');
const { getApplication } = require('./../../infrastructure/applications');
const sortBy = require('lodash/sortBy');

const getUserDetails = async (req) => {
  const uid = req.params.uid;
  const user = await getById(uid, req.id);
  const organisationDetails = user.organisations.filter(x => x.id === req.params.orgId);
  return {
    id: uid,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    status: mapUserStatus(user.statusId),
    organisation: organisationDetails,
    lastLogin: user.lastLogin,
  };
};

const getAllServicesForUserInOrg = async (userId, organisationId, correlationId) => {
  const allUserServices = userId.startsWith('inv-') ? await getServicesForInvitation(userId.substr(4), correlationId) : await getServicesForUser(userId, correlationId);
  if (!allUserServices) {
    return [];
  }

  const userServicesForOrg = allUserServices.filter(x => x.organisationId === organisationId);
  const services = userServicesForOrg.map((service) => ({
    id: service.serviceId,
    dateActivated: service.accessGrantedOn,
    name: '',
    status: null,
  }));
  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    const application = await getApplication(service.id);
    service.name = application.name;
    service.status = mapUserStatus(service.status);
  }
  return sortBy(services, 'name');
};

module.exports = {
  getUserDetails,
  getAllServicesForUserInOrg,
};
