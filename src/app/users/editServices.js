'use strict';
const _ = require('lodash');
const config = require('./../../infrastructure/config');
const { isUserManagement, getSingleServiceForUser, isSelfManagement } = require('./utils');
const { getApplication } = require('./../../infrastructure/applications');
const PolicyEngine = require('login.dfe.policy-engine');
const policyEngine = new PolicyEngine(config);

const renderEditServicePage = (req, res, model) => {
  const isManage = isUserManagement(req);
  res.render(
    `users/views/${isManage ? "editServices" : "editServicesRedesigned"}`,
    { 
      ...model, 
      currentPage: isManage? "users" : "services"
    }
  );
};

const buildBackLink = (req) => {
  let backRedirect = `/approvals/${req.params.orgId}/users/${req.params.uid}/services`;
  if (!isUserManagement(req)) {
    backRedirect = "/approvals/select-organisation-service";
  }
  return backRedirect
}

const getViewModel = async (req) => {
  const userService = await getSingleServiceForUser(req.params.uid, req.params.orgId, req.params.sid, req.id);
  const organisationId = req.params.orgId;
  const organisationDetails = req.userOrganisations.find((x) => x.organisation.id === organisationId);
  const policyResult = await policyEngine.getPolicyApplicationResultsForUser(
    req.params.uid.startsWith('inv-') ? undefined : req.params.uid,
    req.params.orgId,
    req.params.sid,
    req.id,
  );
  const serviceRoles = policyResult.rolesAvailableToUser;
  const application = await getApplication(req.params.sid, req.id);
  return {
    backLink: buildBackLink(req),
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
    serviceDetails: application,
    userService,
    roleMessage:
      application.relyingParty && application.relyingParty.params && application.relyingParty.params.serviceRoleMessage
        ? application.relyingParty.params.serviceRoleMessage
        : undefined,
  };
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users/${req.params.uid}`);
  }

  const model = await getViewModel(req);
  model.service.roles = model.userService.roles;
  saveRoleInSession(req, model.service.roles);

  renderEditServicePage(req, res, model);
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users/${req.params.uid}`);
  }

  let selectedRoles = req.body.role ? req.body.role : [];
  if (!(selectedRoles instanceof Array)) {
    selectedRoles = [req.body.role];
  }

  if (haveRolesBeenUpdated(req, selectedRoles)) {
    return res.redirect(`/approvals/${req.params.orgId}/users/${req.params.uid}/services`);
  }

  const policyValidationResult = await policyEngine.validate(
    req.params.uid.startsWith('inv-') ? undefined : req.params.uid,
    req.params.orgId,
    req.params.sid,
    selectedRoles,
    req.id,
  );

  if (policyValidationResult.length > 0) {
    const model = await getViewModel(req);
    let roles = {};
    model.service.roles = selectedRoles.map((x) => (roles[x] = { id: x }));
    model.validationMessages.roles = policyValidationResult.map((x) => x.message);
    renderEditServicePage(req, res, model);
  }

  saveRoleInSession(req, selectedRoles);
  
  let nexturl  = `${req.params.sid}/confirm-edit-service`;
  if(isUserManagement(req)) {
    nexturl += '?manage_users=true';
  }

  return res.redirect(nexturl);
};

const saveRoleInSession = (req, selectedRoles) => {
  req.session.service = {
    roles: selectedRoles,
  };
};

const haveRolesBeenUpdated = (req, selectedRoles) => {
  if (req.session.service && req.session.service.roles) {
    return _.isEqual(req.session.service.roles.map((item) => item.id).sort(), selectedRoles.sort());
  }
  return true;
};

module.exports = {
  get,
  post,
};
