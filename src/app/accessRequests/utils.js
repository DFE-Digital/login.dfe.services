const { getRequestById } = require('./../../infrastructure/organisations');
const Account = require('./../../infrastructure/account');

const getAndMapOrgRequest = async (req) => {
  const request = await getRequestById(req.params.rid, req.id);
  let mappedRequest;
  if (request) {
    const user = request.status.id === 0 || request.status.id === 2 ? await Account.getById(request.user_id) : await Account.getById(request.actioned_by);
    const usersName = user ? `${user.claims.given_name} ${user.claims.family_name}` : '';
    const usersEmail = user ? user.claims.email : '';
    mappedRequest = Object.assign({usersName, usersEmail}, request);
  }
  return mappedRequest;
};

module.exports = {
  getAndMapOrgRequest,
};
