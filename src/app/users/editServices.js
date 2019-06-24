'use strict';
const config = require('./../../infrastructure/config');
const { getSingleServiceForUser } = require('./utils');
const { getApplication } = require('./../../infrastructure/applications');
const PolicyEngine = require('login.dfe.policy-engine');
const policyEngine = new PolicyEngine(config);

const getViewModel = async (req) => {
  const userService = await getSingleServiceForUser(req.params.uid, req.params.orgId, req.params.sid, req.id);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === organisationId);
  const policyResult = await policyEngine.getPolicyApplicationResultsForUser(req.params.uid.startsWith('inv-') ? undefined : req.params.uid, req.params.orgId, req.params.sid, req.id);
  const serviceRoles = policyResult.rolesAvailableToUser;
  const application = await getApplication(req.params.sid, req.id);
  return {
    backLink: true,
    cancelLink: `/approvals/${req.params.orgId}/users/${req.params.uid}/services`,
    currentPage: 'users',
    csrfToken: req.csrfToken(),
    organisationDetails,
    service: {
      name: userService.name,
      id: userService.id,
    },
    validationMessages: {},
    user: {
      firstName: req.session.user.firstName,
      lastName: req.session.user.lastName,
      email: req.session.user.email,
    },
    serviceRoles,
    userService,
    roleMessage: application.relyingParty && application.relyingParty.params && application.relyingParty.params.serviceRoleMessage ? application.relyingParty.params.serviceRoleMessage : undefined,
  };
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users/${req.params.uid}`)
  }
  const model = await getViewModel(req);

  model.service.roles = model.userService.roles;

  return res.render('users/views/editServices', model);
};


const post = async (req, res) => {
  let selectedRoles = req.body.role ? req.body.role : [];
  if (!(selectedRoles instanceof Array)) {
    selectedRoles = [req.body.role];
  }

  const policyValidationResult = await policyEngine.validate( req.params.uid.startsWith('inv-') ? undefined : req.params.uid, req.params.orgId, req.params.sid, selectedRoles, req.id);

  if (policyValidationResult.length > 0) {
    const model = await getViewModel(req);
    let roles = {};
    model.service.roles = selectedRoles.map(x => roles[x] = {id: x});
    model.validationMessages.roles = policyValidationResult.map(x => x.message);
    return res.render('users/views/editServices', model);
  }

  req.session.service = {
    roles: selectedRoles
  };
  return res.redirect(`${req.params.sid}/confirm-edit-service`)
};

module.exports = {
  get,
  post,
};
