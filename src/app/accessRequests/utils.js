const { getRequestById } = require('./../../infrastructure/organisations');
const Account = require('./../../infrastructure/account');

const getAndMapOrgRequest = async (req) => {
  const request = await getRequestById(req.params.rid, req.id);
  let mappedRequest;
  if (request) {
    const approver = request.actioned_by ? await Account.getById(request.actioned_by) : null;
    const user = await Account.getById(request.user_id);
    const usersName = user ? `${user.claims.given_name} ${user.claims.family_name}` : '';
    const usersEmail = user ? user.claims.email : '';
    const approverName = approver ? `${approver.given_name} ${approver.family_name}` : '';
    const approverEmail = approver ? approver.email : '';
    mappedRequest = Object.assign({usersName, usersEmail, approverName, approverEmail}, request);
  }
  return mappedRequest;
};

module.exports = {
  getAndMapOrgRequest,
};
