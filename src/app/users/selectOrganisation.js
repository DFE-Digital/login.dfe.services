'use strict';
const getNaturalIdentifiers = async (req) => {
  req.userOrganisations = req.userOrganisations.filter((x) => x.role.id === 10000);
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

const buildModel = (req) => {
  return {
    csrfToken: req.csrfToken(),
    title: 'Select Organisation',
    organisations: req.userOrganisations,
    currentPage: 'users',
    selectedOrganisation: req.body.selectedOrganisation,
    validationMessages: {},
    backLink: '/my-services',
  };
};

const get = async (req, res) => {
  await getNaturalIdentifiers(req);

  const model = buildModel(req);
  renderSelectOrganisationPage(req, res, model);
};

const validate = (req) => {
  const model = buildModel(req);

  if (model.selectedOrganisation === undefined || model.selectedOrganisation === null) {
    model.validationMessages.selectedOrganisation = 'Select an organisation to continue.';
  }
  return model;
};

const post = async (req, res) => {
  await getNaturalIdentifiers(req);
  const model = validate(req);

  if (Object.keys(model.validationMessages).length > 0) {
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
