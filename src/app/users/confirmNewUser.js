'use strict';
const { getAllServices } = require('./../../infrastructure/applications');
const { listRolesOfService, addInvitationService, addUserService } = require('./../../infrastructure/access');
const { putUserInOrganisation, putInvitationInOrganisation, getOrganisationById } = require('./../../infrastructure/organisations');
const { getById, updateIndex } = require ('./../../infrastructure/search');
const Account = require('./../../infrastructure/account');
const logger = require('./../../infrastructure/logger');
const config = require('./../../infrastructure/config');

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users`)
  }

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
    backLink: true,
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
      isInvite: req.session.user.isInvite ? req.session.user.isInvite : false,
      uid: req.session.user.uid ? req.session.user.uid : '',
    },
    services,
    organisationDetails,
  });
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users`)
  }

  let uid = req.params.uid;
  const organisationId = req.params.orgId;

  if (!uid) {
    const redirectUri = `https://${config.hostingEnvironment.host}/auth`;
    const invitationId = await Account.createInvite(req.session.user.firstName, req.session.user.lastName, req.session.user.email, 'services', redirectUri);
    uid = `inv-${invitationId}`;
  }

  //if existing invitation or new invite
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
  // patch search index with organisation added to existing user or inv
  if (req.params.uid) {
    const getAllUserDetails = await getById(uid, req.id);
    const organisation = await getOrganisationById(organisationId, req.id);
    const currentOrganisationDetails = getAllUserDetails.organisations;
    const newOrgDetails = {
      id: organisation.id,
      name: organisation.name,
      categoryId: organisation.Category,
      statusId: organisation.Status,
      roleId: 0,
    };
    currentOrganisationDetails.push(newOrgDetails);
    await updateIndex(uid, currentOrganisationDetails, req.id);
  }
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === organisationId);
  const org = organisationDetails.organisation.name;
  if (req.session.user.isInvite) {
    //audit invitation
    logger.audit(`${req.user.email} (id: ${req.user.sub}) invited ${req.session.user.email} to ${org} (id: ${organisationId}) (id: ${uid})`, {
      type: 'approver',
      subType: 'user-invited',
      userId: req.user.sub,
      userEmail: req.user.email,
      invitedUserEmail: req.session.user.email,
      invitedUser: uid,
      organisationId: organisationId,
    });

    res.flash('info', req.params.uid ? `User ${req.session.user.email} added to organisation` : `Invitation email sent to ${req.session.user.email}`);
    res.redirect(`/approvals/${organisationId}/users`);

  } else {
    // audit add services to existing user
    logger.audit(`${req.user.email} (id: ${req.user.sub}) added services for organisation ${org} (id: ${organisationId}) for user ${req.session.user.email} (id: ${uid})`, {
      type: 'approver',
      subType: 'user-services-added',
      userId: req.user.sub,
      userEmail: req.user.email,
      editedUser: uid,
      editedFields: [{
        name: 'add_services',
        newValue: req.session.user.services,
      }],
    });

    res.flash('info', `Services successfully added`);
    res.redirect(`/approvals/${organisationId}/users/${req.session.user.uid}/services`)
  }
};

module.exports = {
  get,
  post,
};
