'use strict';
const { getApproverOrgsFromReq } = require('./utils');

const getNaturalIdentifiers = async (req) => {
  req.userOrganisations = getApproverOrgsFromReq(req);
  for (let i = 0; i < req.userOrganisations.length; i++) {
    const org = req.userOrganisations[i];
    if (org.organisation) {
      org.naturalIdentifiers = [];
      const urn = org.organisation.urn;
      const uid = org.organisation.uid;
      const ukprn = org.organisation.ukprn;
      if (urn) {
        org.naturalIdentifiers.push(`URN: ${urn}`);
      }
      if (uid) {
        org.naturalIdentifiers.push(`UID: ${uid}`);
      }
      if (ukprn) {
        org.naturalIdentifiers.push(`UKPRN: ${ukprn}`);
      }
    }
  }
};

const renderSelectOrganisationPage = (req, res, model) => {
  const isManage = req.query.manage_users === 'true';
  const isEdit = req.query.services === 'edit';
  res.render(
    `users/views/${isManage || isEdit ? "selectOrganisation": "selectOrganisationRedesigned"}`, 
    { ...model, currentPage: isManage || isEdit ? "users": "services" }
  );
};


const get = async (req, res) => {
  await getNaturalIdentifiers(req);

  const model = {
    csrfToken: req.csrfToken(),
    title: 'Select Organisation',
    organisations: req.userOrganisations,
    currentPage: 'users',
    selectedOrganisation: req.session.user ? req.session.user.organisation : null,
    validationMessages: {},
    backLink: '/my-services',
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
  };

  if (model.selectedOrganisation === undefined || model.selectedOrganisation === null) {
    model.validationMessages.selectedOrganisation = 'Select an organisation to continue.';
  }
  return model;
};

const post = async (req, res) => {
  await getNaturalIdentifiers(req);
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
  } else {
    return res.redirect(`/approvals/${model.selectedOrganisation}/users`);
  }
};

module.exports = {
  get,
  post,
};
