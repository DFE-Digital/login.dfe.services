'use strict';
const logger = require('./../../infrastructure/logger');
const { getUserDetails, getSingleServiceForUser } = require('./utils');
const { listRolesOfService, updateUserService, updateInvitationService } = require ('./../../infrastructure/access');

const getSelectedRoles = async (req) => {
  let selectedRoleIds = req.session.service.roles;
  const allRolesOfService = await listRolesOfService(req.params.sid, req.id);
  let roleDetails;

  if (selectedRoleIds && !Array.isArray(selectedRoleIds)) {
    selectedRoleIds = [selectedRoleIds];
  }
  if (selectedRoleIds) {
    roleDetails = allRolesOfService.filter(x => selectedRoleIds.find(y=> y.toLowerCase() === x.id.toLowerCase()));
  } else  {
    roleDetails = [];
  }
  return roleDetails;
};

const get = async (req, res) => {
  const user = await getUserDetails(req);
  const userService = await getSingleServiceForUser(req.params.uid, req.params.orgId, req.params.sid, req.id);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.filter(x => x.organisation.id === organisationId);
  const roleDetails = await getSelectedRoles(req);
  return res.render('users/views/confirmEditService', {
    csrfToken: req.csrfToken(),
    organisation: organisationDetails,
    currentPage: 'users',
    backLink: 'edit-service',
    user,
    roles: roleDetails,
    service: userService,
  });
};

const post = async (req, res) => {
  const uid = req.params.uid;
  const organisationId = req.params.orgId;
  const serviceId = req.params.sid;
  const service = await getSingleServiceForUser(uid, organisationId, serviceId, req.id);
  const selectedRoles = req.session.service.roles;

  if(uid.startsWith('inv-')) {
    await updateInvitationService(uid.substr(4), serviceId, organisationId, selectedRoles, req.id);
  } else {
    await updateUserService(uid, serviceId, organisationId, selectedRoles, req.id);
  }
  res.flash('info', `${service.name} updated successfully`);
  return res.redirect(`/approvals/${organisationId}/users/${uid}/services`);
};

module.exports = {
  get,
  post,
};
