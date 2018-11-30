'use strict';
const { putUserInOrganisation, putInvitationInOrganisation } = require('./../../infrastructure/organisations');
const { getById, updateIndex } = require ('./../../infrastructure/search');
const logger = require('./../../infrastructure/logger');
const { getUserDetails } = require('./utils');


const get = async (req, res) => {
  const user = await getUserDetails(req);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === organisationId);
  return res.render('users/views/editPermission', {
    csrfToken: req.csrfToken(),
    organisationDetails,
    currentPage: 'users',
    backLink: 'services',
    validationMessages: {},
    user,

  });
};

const post = async (req, res) => {
  const user = await getUserDetails(req);
  const role = parseInt(req.body.selectedLevel);
  const uid = req.params.uid;
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === organisationId);
  const permissionName = role === 10000 ? 'approver' : 'end user';

  if(uid.startsWith('inv-')) {
    await putInvitationInOrganisation(uid.substr(4), organisationId, role, req.id);
  } else {
    await putUserInOrganisation(uid, organisationId, 1, role, req.id);
  }
  // patch search indexer with new role
  const getAllUserDetails = await getById(uid, req.id);
  const allOrganisationDetails = getAllUserDetails.organisations;
  const updatedOrganisationDetails = allOrganisationDetails.map( org => {
    if (org.id === organisationId) {
      return Object.assign({}, org, {roleId:role})
    }
    return org
  });

  await updateIndex(uid, updatedOrganisationDetails, req.id);

  logger.audit(`${req.user.email} (id: ${req.user.sub}) edited permission level to ${permissionName} for org ${organisationDetails.organisation.name} (id: ${organisationId}) for user ${user.email} (id: ${uid})`, {
    type: 'approver',
    subType: 'user-org-permission-edited',
    userId: req.user.sub,
    userEmail: req.user.email,
    editedUser: uid,
    editedFields: [{
      name: 'edited_permission',
      newValue: permissionName,
    }],
  });
  res.flash('info', role === 10000 ? `${user.firstName} ${user.lastName} now has approver access to ${organisationDetails.organisation.name}` : `${user.firstName} ${user.lastName} approver access has been removed for ${organisationDetails.organisation.name}` );
  return res.redirect(`/approvals/${organisationId}/users/${uid}/services`);
};

module.exports = {
  get,
  post,
};
