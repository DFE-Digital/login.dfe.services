'use strict';
const { getApproverOrgsFromReq, getUserOrgsFromReq, isUserManagement, isUserApprover, isUserEndUser, getOrgNaturalIdentifiers } = require('./utils');

const buildAdditionalOrgDetails = (userOrgs) => {
  userOrgs.forEach((userOrg) => {
    const org = userOrg.organisation;
    userOrg.naturalIdentifiers = getOrgNaturalIdentifiers(org);
  });
};

const renderSelectOrganisationPage = (req, res, model) => {
  const isManage = isUserManagement(req);
  const isEdit = req.query.services === 'edit';
  res.render(
    `users/views/${isManage || isEdit ? "selectOrganisation": "selectOrganisationRedesigned"}`, 
    { ...model, currentPage: isManage || isEdit ? "users": "services" }
  );
};


const setUserOrgs =  (req) => {
  const isApprover = isUserApprover(req);
  const isEndUser = isUserEndUser(req);
  const hasDualPermission = isEndUser && isApprover;
  req.userOrganisations = hasDualPermission || !isApprover ? getUserOrgsFromReq(req) : getApproverOrgsFromReq(req);
  return { isApprover, hasDualPermission };
}

const get = async (req, res) => {
  const { isApprover, hasDualPermission } = setUserOrgs(req);

  buildAdditionalOrgDetails(req.userOrganisations);

  const model = {
    csrfToken: req.csrfToken(),
    title: 'Select Organisation',
    organisations: req.userOrganisations,
    currentPage: 'users',
    selectedOrganisation: req.session.user ? req.session.user.organisation : null,
    validationMessages: {},
    backLink: '/my-services',
    isApprover,
    hasDualPermission
  };

  renderSelectOrganisationPage(req, res, model);
};

const validate = (req) => {
  const selectedOrg = req.body.selectedOrganisation;
  const model = {
    organisations: req.userOrganisations,
    currentPage: 'users',
    selectedOrganisation: selectedOrg,
    validationMessages: {},
    backLink: '/my-services'
  };

  if (model.selectedOrganisation === undefined || model.selectedOrganisation === null) {
    model.validationMessages.selectedOrganisation = 'Select an organisation to continue.';
  }
  return model;
};

const post = async (req, res) => {
  const { isApprover, hasDualPermission } = setUserOrgs(req);

  buildAdditionalOrgDetails(req.userOrganisations);
  
  const model = validate(req);
  model.isApprover = isApprover
  model.hasDualPermission = hasDualPermission

  // persist selected org in session
  if (req.session.user) {
    req.session.user.organisation = model.selectedOrganisation;
  }

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return renderSelectOrganisationPage(req, res, model);
  }
  const selectedOrg = model.organisations.filter(o => o.organisation.id === model.selectedOrganisation)
  const isApproverForSelectedOrg = selectedOrg.filter(r => r.role.id === 10000).length > 0

  if (req.query.services === 'add' || req.query.services === 'request') {
    if(isApproverForSelectedOrg) {
      return res.redirect(`/approvals/${model.selectedOrganisation}/users/${req.user.sub}/associate-services`);
    }
    return res.redirect(`/request-service/${model.selectedOrganisation}/users/${req.user.sub}`);
  } else if (req.query.services === 'edit') {
    return res.redirect(`/approvals/${model.selectedOrganisation}/users/${req.user.sub}`);
  } else {
    return res.redirect(`/approvals/${model.selectedOrganisation}/users`);
  }
};

module.exports = {
  get,
  post,
};

