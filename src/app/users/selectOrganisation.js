'use strict';

const get = async (req, res) => {
  for (let i= 0; i < req.userOrganisations.length; i++) {
    const org = req.userOrganisations[i];
    if (org.organisation) {
      org.naturalIdentifiers = [];
      const urn = org.organisation.urn;
      const uid = org.organisation.uid;
      const ukprn = org.organisation.ukprn;
      if (urn) {
        org.naturalIdentifiers.push(`URN: ${urn}`)
      }
      if (uid) {
        org.naturalIdentifiers.push(`UID: ${uid}`)
      }
      if (ukprn) {
        org.naturalIdentifiers.push(`UKPRN: ${ukprn}`)
      }
    }
  }
  return res.render('users/views/selectOrganisation', {
    csrfToken: req.csrfToken(),
    title: 'Select Organisation',
    organisations: req.userOrganisations,
    currentPage: 'users',
    selectedOrganisation: null,
    validationMessages: {},
  });
};

const validate = (req) => {
  const selectedOrg = req.body.selectedOrganisation;
  const model = {
    organisations: req.userOrganisations,
    currentPage: 'users',
    selectedOrganisation: selectedOrg,
    validationMessages: {},
  };

  if (model.selectedOrganisation === undefined || model.selectedOrganisation === null) {
    model.validationMessages.selectedOrganisation = 'Please select an organisation'
  }
  return model;
};

const post = async (req, res) => {
  const model = validate(req);

  if (Object.keys(model.validationMessages).length > 0) {
    model.csrfToken = req.csrfToken();
    return res.render('users/views/selectOrganisation', model);
  }
  return res.redirect(`/approvals/${model.selectedOrganisation}/users`)
};

module.exports = {
  get,
  post,
};
