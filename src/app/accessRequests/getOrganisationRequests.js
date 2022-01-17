const { getRequestsForOrganisations } = require('./../../infrastructure/organisations');
const { getApproverOrgsFromReq } = require('../users/utils');

const Account = require('./../../infrastructure/account');
const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');
const sortBy = require('lodash/sortBy');

const getUserDetails = async (usersForApproval) => {
  const allUserId = flatten(usersForApproval.map((user) => user.user_id));
  if (allUserId.length === 0) {
    return [];
  }
  const distinctUserIds = uniq(allUserId);
  return await Account.getUsersById(distinctUserIds);
};

const mapOrganisationsWithRequest = async (req) => {
  let orgsWithRequests;
  req.userOrganisations = getApproverOrgsFromReq(req);
  
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


const getOrganisationRequests = async (req, res) => {
  const orgs = await mapOrganisationsWithRequest(req)
  const orgIds = orgs.map(o => o.organisation.id)
  const encodedOrgIds = encodeURIComponent(JSON.stringify(orgIds))
  let requests = await getRequestsForOrganisations(encodedOrgIds, req.id);

  if (requests) {
    const userList = (await getUserDetails(requests)) || [];

    requests = requests.map((user) => {
      const userFound = userList.find((c) => c.claims.sub.toLowerCase() === user.user_id.toLowerCase());
      const usersEmail = userFound ? userFound.claims.email : '';
      const userName = userFound ? `${userFound.claims.given_name} ${userFound.claims.family_name}` : '';
      return Object.assign({ usersEmail, userName }, user);
    });

    requests = sortBy(requests, ['created_date']).reverse();
  }

  return res.render('accessRequests/views/organisationRequests', {
    csrfToken: req.csrfToken(),
    title: 'Requests - DfE Sign-in',
    currentPage: 'requests',
    requests
  });
};

module.exports = getOrganisationRequests;
