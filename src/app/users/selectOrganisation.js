'use strict';
const { getApproverOrgsFromReq, getUserOrgsFromReq, isUserManagement, isUserApprover, getOrgNaturalIdentifiers } = require('./utils');

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


const get = async (req, res) => {
  const isApprover = isUserApprover(req)
  req.userOrganisations = isApprover ? getApproverOrgsFromReq(req) : getUserOrgsFromReq(req);

  buildAdditionalOrgDetails(req.userOrganisations);

  const model = {
    csrfToken: req.csrfToken(),
    title: 'Select Organisation',
    organisations: req.userOrganisations,
    currentPage: 'users',
    selectedOrganisation: req.session.user ? req.session.user.organisation : null,
    validationMessages: {},
    backLink: '/my-services',
    isApprover
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
    backLink: '/my-services',
    isApprover: isUserApprover(req),
  };

  if (model.selectedOrganisation === undefined || model.selectedOrganisation === null) {
    model.validationMessages.selectedOrganisation = 'Select an organisation to continue.';
  }
  return model;
};

const post = async (req, res) => {
  const isApprover = isUserApprover(req)
  req.userOrganisations = isApprover ? getApproverOrgsFromReq(req) : getUserOrgsFromReq(req);

  buildAdditionalOrgDetails(req.userOrganisations);
  const model = validate(req);

  // persist selected org in session
  if (req.session.user) {
    req.session.user.organisation = model.selectedOrganisation;
  }

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return renderSelectOrganisationPage(req, res, model);
  }

  if (req.query.services === 'add') {
    return res.redirect(`/approvals/${model.selectedOrganisation}/users/${req.user.sub}/associate-services`);
  } else if (req.query.services === 'edit') {
    return res.redirect(`/approvals/${model.selectedOrganisation}/users/${req.user.sub}`);
  } else if (req.query.services === 'request') {
    return res.redirect(`/request-service/${model.selectedOrganisation}/users/${req.user.sub}`);
  } else {
    return res.redirect(`/approvals/${model.selectedOrganisation}/users`);
  }
};

module.exports = {
  get,
  post,
};
