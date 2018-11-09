'use strict';
const logger = require('./../../infrastructure/logger');
const { getUserDetails, getSingleServiceForUser } = require('./utils');
const { listRolesOfService } = require('./../../infrastructure/access');

const get = async (req, res) => {
  const user = await getUserDetails(req);
  const userService = await getSingleServiceForUser(req.params.uid, req.params.orgId, req.params.sid, req.id);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.filter(x => x.organisation.id === organisationId);
  const serviceRoles = await listRolesOfService(req.params.sid, req.id);

  //TODO: only display roles with status 1? And check current user roles and all service roles model match
  return res.render('users/views/editServices', {
    backLink: 'user-details',
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    organisation: organisationDetails,
    service : userService,
    user,
    serviceRoles,
  });
};

const post = async (req, res) => {
  //:TODO: post to confirm edit services page- check at least one role selected
};

module.exports = {
  get,
  post,
};
