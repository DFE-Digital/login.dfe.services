'use strict';
const config = require('./../../infrastructure/config');
const { getUserDetails, getSingleServiceForUser } = require('./utils');
const PolicyEngine = require('login.dfe.policy-engine');
const policyEngine = new PolicyEngine(config);

const get = async (req, res) => {
  const user = await getUserDetails(req);
  const userService = await getSingleServiceForUser(req.params.uid, req.params.orgId, req.params.sid, req.id);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === organisationId);
  const serviceRoles = await policyEngine.getRolesAvailableForUser(req.params.uid, req.params.orgId, req.params.sid, req.get('x-correlation-id'));
  const model = {
    backLink: 'user-details',
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    organisationDetails,
    service: userService,
    user,
    serviceRoles,
    selectedRoles: [],
  };

  if (req.session.service) {
    model.selectedRoles = req.session.service.roles;
  }
  //TODO: only display roles with status 1?
  return res.render('users/views/editServices', model);
};


const post = async (req, res) => {
  const selectedRoles = req.body.role;
  req.session.service = {
    roles: selectedRoles
  };
  return res.redirect(`${req.params.sid}/confirm-edit-service`)
};

module.exports = {
  get,
  post,
};
