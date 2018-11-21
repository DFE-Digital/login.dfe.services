'use strict';
const {getAllServices} = require('./../../infrastructure/applications');
const {listRolesOfService, addInvitationService, addUserService} = require('./../../infrastructure/access');
const {putUserInOrganisation, putInvitationInOrganisation} = require('./../../infrastructure/organisations');
const Account = require('./../../infrastructure/account');
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
    const roleDetails = allRolesOfService.filter(x => service.roles.find(y => y.toLowerCase() === x.id.toLowerCase()));
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
      isInvite: req.session.user.isInvite ? req.session.user.isInvite : false,
    },
    services,
    organisationDetails,
  });
};

const post = async (req, res) => {
  let uid = req.params.uid;
  const organisationId = req.params.orgId;

  if (!uid) {
    const invitationId = await Account.createInvite(req.session.user.firstName, req.session.user.lastName, req.session.user.email);
    uid = `inv-${invitationId}`;
  }

  //if existing invitation
  if (uid.startsWith('inv-')) {
    const invitationId = uid.substr(4);
    await putInvitationInOrganisation(invitationId, organisationId, 0, req.id);
    if (req.session.user.services) {
      for (let i = 0; i < req.session.user.services.length; i++) {
        const service = req.session.user.services[i];
        await addInvitationService(invitationId, service.serviceId, organisationId, service.roles, req.id);
      }
    }
  } else {
    //if existing user not in org
    if (req.session.user.isInvite) {
      await putUserInOrganisation(uid, organisationId, 0, req.id);
    }
    if (req.session.user.services) {
      for (let i = 0; i < req.session.user.services.length; i++) {
        const service = req.session.user.services[i];
        await addUserService(uid, service.serviceId, organisationId, service.roles, req.id);
      }
    }
  }

  if (req.session.user.isInvite) {
    res.flash('info', req.params.uid ? `User ${req.session.user.email} added to organisation` : `Invitation email sent to ${req.session.user.email}`);
    res.redirect(`/approvals/${organisationId}/users`);
  } else {
    res.flash('info', `Services successfully added`);
    res.redirect(`/approvals/${organisationId}/users/${req.session.user.uid}/services`)
  }
  //TODO: Audit invite new user, add existing user, add existing invitation
};

module.exports = {
  get,
  post,
};
