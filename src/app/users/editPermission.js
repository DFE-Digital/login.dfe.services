'use strict';
const { putUserInOrganisation, putInvitationInOrganisation } = require('./../../infrastructure/organisations');
const logger = require('./../../infrastructure/logger');
const { getUserDetails} = require('./utils');


const get = async (req, res) => {
  const user = await getUserDetails(req);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.filter(x => x.organisation.id === organisationId);
  return res.render('users/views/editPermission', {
    csrfToken: req.csrfToken(),
    organisation: organisationDetails,
    currentPage: 'users',
    backLink: 'users-details',
    validationMessages: {},
    user,

  });
};

const post = async (req, res) => {
  const user = await getUserDetails(req);
  const role = parseInt(req.body.selectedLevel);
  const uid = req.params.uid;
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.filter(x => x.organisation.id === organisationId);
  const permissionName = role === 10000 ? 'approver' : 'end user';

  if(uid.startsWith('inv-')) {
    await putInvitationInOrganisation(uid.substr(4), organisationId, role, req.id);
  } else {
    await putUserInOrganisation(uid, organisationId, 1, role, req.id);
  }
  res.flash('info', `${user.name} now has ${permissionName} access to ${organisationDetails[0].organisation.name}`);
  return res.redirect(`/approvals/${organisationId}/users/${uid}`);
};

module.exports = {
  get,
  post,
};
