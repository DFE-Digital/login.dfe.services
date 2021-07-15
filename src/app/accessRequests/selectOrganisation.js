'use strict';
const { getApproverOrgsFromReq } = require('../users/utils');

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

const mapOrganisationsWithRequest = async (req) => {
  let orgsWithRequests;
  await getNaturalIdentifiers(req);
  if (req.organisationRequests.length > 0) {
    orgsWithRequests = req.userOrganisations.filter((x) =>
      req.organisationRequests.find((y) => y.org_id === x.organisation.id),
    );
    for (let i = 0; i < orgsWithRequests.length; i++) {
      const org = orgsWithRequests[i];
      org.requestCount = req.organisationRequests.reduce((a, c) => (c.org_id === org.organisation.id ? ++a : a), 0);
    }
  } else {
    orgsWithRequests = req.userOrganisations;
  }
  return orgsWithRequests;
};

const get = async (req, res) => {
  const orgs = await mapOrganisationsWithRequest(req);

  return res.render('accessRequests/views/selectOrganisation', {
    csrfToken: req.csrfToken(),
    title: 'Select Organisation - DfE Sign-in',
    organisations: orgs,
    selectedOrganisation: null,
    backLink: true,
    validationMessages: {},
    currentPage: 'users',
  });
};

const post = async (req, res) => {
  const selectedOrg = req.body.selectedOrganisation;
  if (selectedOrg === undefined || selectedOrg === null) {
    const orgs = await mapOrganisationsWithRequest(req);
    return res.render('accessRequests/views/selectOrganisation', {
      csrfToken: req.csrfToken(),
      title: 'Select Organisation - DfE Sign-in',
      organisations: orgs,
      selectedOrganisation: selectedOrg,
      backLink: true,
      validationMessages: { selectedOrganisation: 'An organisation must be selected' },
      currentPage: 'users',
    });
  }
  return res.redirect(`/access-requests/${selectedOrg}/requests`);
};

module.exports = {
  get,
  post,
};
