'use strict';

const logger = require('./../../infrastructure/logger');
const { getAllServicesForUserInOrg } = require('./utils');
const { deleteUserOrganisation, deleteInvitationOrganisation } = require('./../../infrastructure/organisations');
const { removeServiceFromUser, removeServiceFromInvitation } = require('./../../infrastructure/access');
const { getById, updateIndex } = require ('./../../infrastructure/search');

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users/${req.params.uid}`)
  }
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === organisationId);
  const servicesForUser = await getAllServicesForUserInOrg(req.params.uid, req.params.orgId, req.id);

  return res.render('users/views/removeOrganisation', {
    csrfToken: req.csrfToken(),
    organisationDetails,
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
    },
    currentPage: 'users',
    backLink: 'services',
    services: servicesForUser,
  });
};


const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users/${req.params.uid}`)
  }
  const uid = req.params.uid;
  const organisationId = req.params.orgId;
  const servicesForUser = await getAllServicesForUserInOrg(uid, organisationId, req.id);

  if(uid.startsWith('inv-')) {
    for (let i = 0; i < servicesForUser.length; i++) {
      const service = servicesForUser[i];
      await removeServiceFromInvitation(uid.substr(4), service.id, organisationId, req.id);
    }
    await deleteInvitationOrganisation(uid.substr(4), organisationId, req.id);
  } else {
    for (let i = 0; i < servicesForUser.length; i ++) {
      const service = servicesForUser[i];
      await removeServiceFromUser(uid, service.id, organisationId, req.id);
    }
    await deleteUserOrganisation(uid, organisationId, req.id);
  }
  // patch search indexer to remove org
  const getAllUserDetails = await getById(uid, req.id);
  const currentOrganisationDetails = getAllUserDetails.organisations;
  const updatedOrganisationDetails = currentOrganisationDetails.filter(org => org.id !== organisationId);
  await updateIndex(uid, updatedOrganisationDetails, req.id);

  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === organisationId);
  const org = organisationDetails.organisation.name;

  logger.audit(`${req.user.email} (id: ${req.user.sub}) removed organisation ${org} (id: ${organisationId}) for user ${req.session.user.email} (id: ${uid})`, {
    type: 'approver',
    subType: 'user-org-deleted',
    userId: req.user.sub,
    userEmail: req.user.email,
    editedUser: uid,
    editedFields: [{
      name: 'new_organisation',
      oldValue: organisationId,
      newValue: undefined,
    }],
  });
  res.flash('info', `${req.session.user.firstName} ${req.session.user.lastName} has been removed from ${org}`);
  return res.redirect(`/approvals/${organisationId}/users`);
};

module.exports = {
  get,
  post,
};
