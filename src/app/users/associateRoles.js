'use strict';
const config = require('./../../infrastructure/config');
const { getApplication } = require('./../../infrastructure/applications');
const PolicyEngine = require('login.dfe.policy-engine');
const policyEngine = new PolicyEngine(config);

const get = async (req, res) => {
  const totalNumberOfServices = req.session.user.services.length;
  const currentService = req.session.user.services.findIndex(x => x.serviceId === req.params.sid) + 1;

  const serviceDetails = await getApplication(req.params.sid, req.id);
  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === req.params.orgId);
  const uid = req.params.uid ? req.params.uid : undefined;
  const serviceRoles = await policyEngine.getRolesAvailableForUser(uid, req.params.orgId, req.params.sid, req.id);

  const model = {
    csrfToken: req.csrfToken(),
    name: req.session.user ? `${req.session.user.firstName} ${req.session.user.lastName}` : '',
    validationMessages: {},
    backLink: 'associate-services',
    currentPage: 'users',
    organisationDetails,
    selectedRoles: req.session.user.services.roles ? req.session.user.services.roles : [],
    serviceDetails,
    serviceRoles,
    currentService,
    totalNumberOfServices,
  };

  res.render('users/views/associateRoles', model);
};

const post = async (req, res) => {
  const currentService = req.session.user.services.findIndex(x => x.serviceId === req.params.sid);

  let selectedRoles = req.body.role ? req.body.role : [];

  if(!(selectedRoles instanceof Array)){
    selectedRoles= [req.body.role];
  }
  req.session.user.services[currentService].roles = selectedRoles;


  if (currentService < req.session.user.services.length -1) {
    const nextService = currentService + 1;
    return res.redirect(`${req.session.user.services[nextService].serviceId}`)
  }
  else {
    //TODO: redirect to the review page
    return req.session.user.uid ? res.redirect(`/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-details`) : res.redirect(`/approvals/${req.params.orgId}/users/confirm-new-user`);
  }
};

module.exports = {
  get,
  post,
};
