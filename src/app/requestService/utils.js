const { services } = require('login.dfe.dao');
const { getNonPagedRequestsTypesForApprover } = require('../../infrastructure/organisations');
const mapUserServiceRequestStatus = (status) => {
  if (status === 0) {
    return { id: 0, description: 'Pending' };
  }
  if (status === -1) {
    return { id: -1, description: 'Rejected' };
  }
  if (status === 1) {
    return { id: 1, description: 'Approved' };
  }
};

const getUserServiceRequestStatus = async (reqId) => {
  const userServiceRequest = await services.getUserServiceRequest(reqId);
  return userServiceRequest.status;
};
///method to get request
const checkForActiveRequests = async (organisationDetails, selectServiceID, orgId, uid, reqId, requestType) => {
  const approvers = organisationDetails.approvers;
  if (approvers !== undefined && approvers.length > 0) {
    const approverId = approvers[0];
    const requestservices = await getNonPagedRequestsTypesForApprover(approverId.user_id, reqId);
    if (requestservices !== undefined) {
      const inRequest = requestservices.requests.filter(
        (x) => x.service_id === selectServiceID && x.org_id === orgId && x.user_id === uid,
      );
      if (inRequest !== undefined && inRequest.length > 0) {
        return inRequest[0].created_date;
      }
    }

    return undefined;
  } else {
    return approvers;
  }
};
const updateServiceRequest = async (reqId, statusId, approverId, reason) => {
  const status = mapUserServiceRequestStatus(statusId);

  const result = await services.updateUserPendingServiceRequest(reqId, {
    status: status.id,
    actioned_by: approverId,
    reason: reason ? reason : null,
    actioned_reason: status.description,
    actioned_at: new Date().toISOString(),
  });

  return result;
};

const createServiceRequest = async (reqId, userId, serviceId, rolesIds, organisationId, statusId, requestType) => {
  const status = mapUserServiceRequestStatus(statusId);
  return await services.putUserServiceRequest({
    id: reqId,
    user_id: userId,
    service_id: serviceId,
    role_ids: rolesIds.length ? rolesIds.toString() : null,
    organisation_id: organisationId,
    status: status.id,
    actioned_reason: status.description,
    request_type: requestType,
  });
};

module.exports = { getUserServiceRequestStatus, updateServiceRequest, createServiceRequest, checkForActiveRequests };
