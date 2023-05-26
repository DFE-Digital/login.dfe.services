const {
  getRequestById,
  getOrganisationById,
  getSubServiceRequestById,
} = require('./../../infrastructure/organisations');

const Account = require('./../../infrastructure/account');
const flatten = require('lodash/flatten');
const uniq = require('lodash/uniq');
const { services } = require('login.dfe.dao');

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
    mappedRequest = Object.assign({ usersName, usersEmail, approverName, approverEmail }, request);
  }
  return mappedRequest;
};
const getAndMapSubServiceRequest = async (req) => {
  const result = await getSubServiceRequestById(req.params.rid, req.id);
  return result;
};
const getUserDetails = async (usersForApproval) => {
  const allUserId = flatten(usersForApproval.map((user) => user.user_id));
  if (allUserId.length === 0) {
    return [];
  }
  const distinctUserIds = uniq(allUserId);
  return await Account.getUsersById(distinctUserIds);
};

const getAndMapServiceRequest = async (serviceReqId) => {
  const userServiceRequest = await services.getUserServiceRequest(serviceReqId);
  let mappedServiceRequest;
  if (userServiceRequest) {
    const approver = userServiceRequest.actioned_by ? await Account.getById(userServiceRequest.actioned_by) : null;
    const endUser = await Account.getById(userServiceRequest.user_id);
    const endUsersGivenName = endUser ? `${endUser.claims.given_name}` : '';
    const endUsersFamilyName = endUser ? `${endUser.claims.family_name}` : '';
    const endUsersEmail = endUser ? endUser.claims.email : '';
    const approverName = approver ? `${approver.given_name} ${approver.family_name}` : '';
    const approverEmail = approver ? approver.email : '';
    const organisation = await getOrganisationById(userServiceRequest.organisation_id, serviceReqId);
    mappedServiceRequest = Object.assign(
      { endUsersGivenName, endUsersFamilyName, endUsersEmail, approverName, approverEmail },
      { organisation },
      userServiceRequest,
    );
  }
  return mappedServiceRequest;
};

const generateFlashMessages = (
  requestType,
  requestStatus,
  approverEmail,
  endUsersGivenName,
  endUsersFamilyName,
  orgOrServName,
) => {
  const capitalisedReqType = requestType[0].toUpperCase() + requestType.substring(1);
  const capitalisedGivenName = endUsersGivenName[0].toUpperCase() + endUsersGivenName.substring(1);
  const capitalisedFamilyName = endUsersFamilyName[0].toUpperCase() + endUsersFamilyName.substring(1);
  let action;

  switch (requestStatus) {
    case 1:
      action = 'approved';
      break;
    case -1:
      action = 'rejected';
      break;
  }
  const flashMessages = {
    title: 'Important',
    heading: `${capitalisedReqType} request already ${action}: ${orgOrServName}`,
    message: `${approverEmail} has already responded to the ${requestType} request.<br>${capitalisedGivenName} ${capitalisedFamilyName} has received an email to tell them their request has been ${action}. No further action is needed.`,
  };
  return flashMessages;
};

const isAllowedToApproveReq = async (req, res, next) => {
  if (req.userOrganisations && req.params.rid) {
    const serviceSubServiceReq = await services.getUserServiceRequest(req.params.rid);
    const orgId = serviceSubServiceReq.dataValues.organisation_id;
    const userApproverOrgs = req.userOrganisations.filter((x) => x.role.id === 10000);
    if (userApproverOrgs.find((x) => x.organisation.id.toLowerCase() === orgId.toLowerCase())) {
      return next();
    }
  }
  return res.status(401).render('errors/views/notAuthorised');
};

module.exports = {
  getAndMapOrgRequest,
  getUserDetails,
  getAndMapServiceRequest,
  getAndMapSubServiceRequest,
  generateFlashMessages,
  isAllowedToApproveReq,
};
