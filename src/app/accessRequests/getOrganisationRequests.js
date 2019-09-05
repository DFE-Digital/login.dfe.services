const { getRequestsForOrganisation } = require('./../../infrastructure/organisations');
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
  return await Account.getUsersByIdV2(distinctUserIds);
};

const getOrganisationRequests = async (req, res) => {
  let requests = await getRequestsForOrganisation(req.params.orgId, req.id);

  if (requests) {
    const userList = await getUserDetails(requests) || [];

    requests = requests.map((user) => {
      const userFound = userList.find(c => c.claims.sub.toLowerCase() === user.user_id.toLowerCase());
      const usersEmail = userFound ? userFound.claims.email : '';
      return Object.assign({usersEmail}, user);
    });

    requests = sortBy(requests, ['created_date']);
  }

  const organisationDetails = req.userOrganisations.find(x => x.organisation.id === req.params.orgId);

  return res.render('accessRequests/views/organisationRequests', {
    csrfToken: req.csrfToken(),
    title: 'Requests - DfE Sign-in',
    organisation: organisationDetails.organisation,
    requests,
  });
};

module.exports = getOrganisationRequests;
