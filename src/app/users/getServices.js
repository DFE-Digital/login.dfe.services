'use strict';
const { getServicesForUser, getServicesForInvitation } = require('./../../infrastructure/access');
const { getApplication } = require('./../../infrastructure/applications');
const { mapUserStatus } = require('./../../infrastructure/utils');
const { getUserDetails } = require('./utils');
const sortBy = require('lodash/sortBy');

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


const action = async (req, res) => {
  const user = await getUserDetails(req);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.filter(x => x.organisation.id === organisationId);
  const servicesForUser = await getAllServicesForUserInOrg(req.params.uid, req.params.orgId, req.id);

  req.session.user = {
    name: user.name,
    email: user.email,
  };

  return res.render('users/views/services', {
    backLink: 'users-list',
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    organisation: organisationDetails,
    services: servicesForUser,
    user,
  });
};

module.exports = action;
