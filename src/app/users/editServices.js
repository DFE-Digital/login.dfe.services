'use strict';
const config = require('./../../infrastructure/config');
const logger = require('./../../infrastructure/logger');
const { getUserDetails, getSingleServiceForUser } = require('./utils');
const PolicyEngine = require('login.dfe.policy-engine');
const policyEngine = new PolicyEngine(config);

const get = async (req, res) => {
  const user = await getUserDetails(req);
  const userService = await getSingleServiceForUser(req.params.uid, req.params.orgId, req.params.sid, req.id);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.filter(x => x.organisation.id === organisationId);
  const serviceRoles = await policyEngine.getRolesAvailableForUser(req.params.uid, req.params.orgId, req.params.sid, req.get('x-correlation-id'));
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

const validate = (req) => {

  const model = {
    validationMessages: {},
  };
};
const post = async (req, res) => {
  //:TODO: post to confirm edit services page- check at least one role selected
};

module.exports = {
  get,
  post,
};
