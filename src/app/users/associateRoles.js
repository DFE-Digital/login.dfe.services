'use strict';
const config = require('./../../infrastructure/config');
const { getApplication } = require('./../../infrastructure/applications');
const { getOrganisationAndServiceForUserV2 } = require('./../../infrastructure/organisations');
const PolicyEngine = require('login.dfe.policy-engine');
const policyEngine = new PolicyEngine(config);

const getViewModel = async (req) => {
  const totalNumberOfServices = req.session.user.services.length;
  const currentService = req.session.user.services.findIndex(x => x.serviceId === req.params.sid) + 1;
  const serviceDetails = await getApplication(req.params.sid, req.id);
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === req.params.orgId);

  const userOrganisations = !req.params.uid.startsWith('inv-') ? await getOrganisationAndServiceForUserV2(req.params.uid, req.id): undefined;
  const userAccessToSpecifiedOrganisation = userOrganisations ? userOrganisations.find(x => x.organisation.id.toLowerCase() === req.params.orgId.toLowerCase()) : undefined;
  const policyResult = await policyEngine.getPolicyApplicationResultsForUser(userAccessToSpecifiedOrganisation ? req.params.uid : undefined, req.params.orgId, req.params.sid, req.id);

  const serviceRoles = policyResult.rolesAvailableToUser;
  const selectedRoles = req.session.user.services ? req.session.user.services.find(x => x.serviceId === req.params.sid) : [];

  return {
    csrfToken: req.csrfToken(),
    name: req.session.user ? `${req.session.user.firstName} ${req.session.user.lastName}` : '',
    user: req.session.user,
    validationMessages: {},
    backLink: true,
    currentPage: 'users',
    organisationDetails,
    selectedRoles,
    serviceDetails,
    serviceRoles,
    currentService,
    totalNumberOfServices,
  };
};

const get = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users`)
  }

  const model = await getViewModel(req);

  res.render('users/views/associateRoles', model);
};

const post = async (req, res) => {
  if (!req.session.user) {
    return res.redirect(`/approvals/${req.params.orgId}/users`)
  }

  const currentService = req.session.user.services.findIndex(x => x.serviceId === req.params.sid);
  let selectedRoles = req.body.role ? req.body.role : [];
  if (!(selectedRoles instanceof Array)) {
    selectedRoles = [req.body.role];
  }

  const userOrganisations = !req.params.uid.startsWith('inv-') ? await getOrganisationAndServiceForUserV2(req.params.uid, req.id): undefined;
  const userAccessToSpecifiedOrganisation = userOrganisations ? userOrganisations.find(x => x.organisation.id.toLowerCase() === req.params.orgId.toLowerCase()) : undefined;
  const policyValidationResult = await policyEngine.validate(userAccessToSpecifiedOrganisation ? req.params.uid : undefined, req.params.orgId, req.params.sid, selectedRoles, req.id);

  if (policyValidationResult.length > 0) {
    const model = await getViewModel(req);
    model.validationMessages.roles = policyValidationResult.map(x => x.message);
    return res.render('users/views/associateRoles', model);
  }

  req.session.user.services[currentService].roles = selectedRoles;


  if (currentService < req.session.user.services.length - 1) {
    const nextService = currentService + 1;
    return res.redirect(`${req.session.user.services[nextService].serviceId}`)
  } else {
    return req.session.user.uid ? res.redirect(`/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-details`) : res.redirect(`/approvals/${req.params.orgId}/users/confirm-new-user`);
  }
};

module.exports = {
  get,
  post,
};
