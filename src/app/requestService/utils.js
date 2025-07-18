const { services } = require("login.dfe.dao");

const {
  getServiceRequestsForApproverRaw,
} = require("login.dfe.api-client/services");

const mapUserServiceRequestStatus = (status) => {
  if (status === 0) {
    return { id: 0, description: "Pending" };
  }
  if (status === -1) {
    return { id: -1, description: "Rejected" };
  }
  if (status === 1) {
    return { id: 1, description: "Approved" };
  }
};

const getUserServiceRequestStatus = async (reqId) => {
  const userServiceRequest = await services.getUserServiceRequest(reqId);
  return userServiceRequest.status;
};

const checkForActiveRequests = async (
  organisationDetails,
  selectServiceID,
  orgId,
  uid,
  reqId,
  requestType,
  roleIds,
  totalServiceCount,
) => {
  const approvers = organisationDetails.approvers;
  if (approvers !== undefined && approvers.length > 0) {
    const approverId = approvers[0];
    const requestservices = await getServiceRequestsForApproverRaw({
      userId: approverId.user_id,
    });
    if (requestservices !== undefined) {
      if (requestType !== "subservice") {
        let inRequest = requestservices.requests.filter(
          (x) =>
            x.service_id === selectServiceID &&
            x.org_id === orgId &&
            x.user_id === uid,
        );
        if (inRequest !== undefined && inRequest.length > 0) {
          return inRequest[0].created_date;
        }
      } else {
        let AlreadyRequestedRoles = [];
        let RequestedRoles = requestservices.requests.filter(
          (x) =>
            x.service_id === selectServiceID &&
            x.org_id === orgId &&
            x.user_id === uid,
        );
        if (RequestedRoles !== undefined && RequestedRoles.length > 0) {
          ///test each roleId to see if it in this array
          let checkList = [];
          RequestedRoles.forEach((item) => {
            if (item.role_ids.includes(",")) {
              let tempArr = item.role_ids.split(",");
              tempArr.forEach((numString) => {
                checkList.push(numString);
              });
            } else {
              checkList.push(item.role_ids);
            }
          });
          checkList = checkList.filter(
            (value, index, array) => array.indexOf(value) === index,
          );
          if (checkList.length !== totalServiceCount) {
            checkList.forEach((chid) => {
              roleIds.forEach((rid) => {
                if (chid === rid) {
                  AlreadyRequestedRoles.push(chid);
                }
              });
            });
            //return unique items
            return AlreadyRequestedRoles.filter(
              (value, index, array) => array.indexOf(value) === index,
            );
          } else return checkList;
        }
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

const createServiceRequest = async (
  reqId,
  userId,
  serviceId,
  rolesIds,
  organisationId,
  statusId,
  requestType,
) => {
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

module.exports = {
  getUserServiceRequestStatus,
  updateServiceRequest,
  createServiceRequest,
  checkForActiveRequests,
};
