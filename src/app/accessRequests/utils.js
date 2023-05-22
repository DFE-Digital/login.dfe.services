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

const isReqAlreadyActioned = (
  requestType,
  requestStatus,
  approverEmail,
  endUsersGivenName,
  endUsersFamilyName,
  orgOrServName,
  res,
) => {
  const capitalisedReqType = requestType[0].toUpperCase() + requestType.substring(1);
  const capitalisedGivenName = endUsersGivenName[0].toUpperCase() + endUsersGivenName.substring(1);
  const capitalisedFamilyName = endUsersFamilyName[0].toUpperCase() + endUsersFamilyName.substring(1);

  res.flash('notificationTitle', 'Important');
  if (requestStatus === 1) {
    res.flash('notificationHeading', `${capitalisedReqType} request already approved: ${orgOrServName}`);
    res.flash(
      'notificationMessage',
      `${approverEmail} has already responded to the ${requestType} request.<br>${capitalisedGivenName} ${capitalisedFamilyName} has received an email to tell them their request has been approved. No further action is needed.`,
    );
  } else if (requestStatus === -1) {
    res.flash('notificationHeading', `${capitalisedReqType} request already rejected: ${orgOrServName}`);
    res.flash(
      'notificationMessage',
      `${approverEmail} has already responded to the ${requestType} request.<br>${capitalisedGivenName} ${capitalisedFamilyName} has received an email to tell them their request has been rejected. No further action is needed.`,
    );
  }
  return res.redirect('/access-requests/requests');
};

module.exports = {
  getAndMapOrgRequest,
  getUserDetails,
  getAndMapServiceRequest,
  getAndMapSubServiceRequest,
  isReqAlreadyActioned,
};
