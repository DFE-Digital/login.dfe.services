'use strict';
const { getAllServices } = require('./../../infrastructure/applications');
const { listRolesOfService } = require ('./../../infrastructure/access');

const get = async (req, res) => {
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === req.params.orgId);
  const services = req.session.user.services.map(service => ({
    id: service.serviceId,
    name: '',
    roles: service.roles,
  }));
  const allServices = await getAllServices(req.id);
  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    const serviceDetails = allServices.services.find(x => x.id === service.id);
    const allRolesOfService = await listRolesOfService(service.id, req.id);
    const roleDetails = allRolesOfService.filter(x => service.roles.find(y=> y.toLowerCase() === x.id.toLowerCase()));
    service.name = serviceDetails.name;
    service.roles = roleDetails;
  }
  return res.render('users/views/confirmNewUser', {
    backLink: 'select-roles',
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
    },
    services,
    organisationDetails,
  });
};

const post = async (req, res) => {
  //TODO: Add org, services and roles to user if req.params.uid exists

  //TODO: Add org, services and roles to invitation if req.params.uid starts with inv-

  //TODO: Create invite if no user uid. add org, services and roles to invite.
};

module.exports = {
  get,
  post,
};
