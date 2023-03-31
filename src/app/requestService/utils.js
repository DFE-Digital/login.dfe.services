const { services } = require('login.dfe.dao');

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
    requet_type: requestType,
  });
};

module.exports = { getUserServiceRequestStatus, updateServiceRequest, createServiceRequest };
