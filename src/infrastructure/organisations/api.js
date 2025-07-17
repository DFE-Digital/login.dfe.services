const config = require("./../config");
const jwtStrategy = require("login.dfe.jwt-strategies");
const { fetchApi } = require("login.dfe.async-retry");
const { organisation, invitation } = require("login.dfe.dao");

const callApi = async (method, path, correlationId, body) => {
  const token = await jwtStrategy(
    config.organisations.service,
  ).getBearerToken();

  const hasSeperator =
    (config.organisations.service.url.endsWith("/") && !path.startsWith("/")) ||
    (!config.organisations.service.url.endsWith("/") && path.startsWith("/"));
  const basePathSeperator = hasSeperator ? "" : "/";
  const opts = {
    method,
    headers: {
      authorization: `bearer ${token}`,
      "x-correlation-id": correlationId,
    },
  };
  if (body && (method === "POST" || method !== "PUT" || method !== "PATCH")) {
    opts.body = body;
  }
  return fetchApi(
    `${config.organisations.service.url}${basePathSeperator}${path}`,
    opts,
  );
};

const getOrganisationAndServiceForUser = async (userId) => {
  return await organisation.getOrganisationsForUserIncludingServices(userId);
};

const getOrganisationUsersForApproval = async (userId, correlationId) => {
  return callApi(
    "GET",
    `/organisations/users-for-approval/${userId}`,
    correlationId,
  );
};

const putUserInOrganisation = async (userId, orgId, status, role, reason) => {
  const userOrg = {
    user_id: userId,
    organisation_id: orgId,
    role_id: role,
    status,
    reason,
  };
  return organisation.putUserOrganisation(userOrg);
};

const deleteUserOrganisation = async (userId, organisationId) => {
  return await organisation.deleteUserOrganisation(organisationId, userId);
};
const deleteInvitationOrganisation = async (invitationId, organisationId) => {
  return await invitation.deleteInvitationOrganisation(
    organisationId,
    invitationId,
  );
};

const putInvitationInOrganisation = async (invitationId, orgId, role) => {
  return invitation.putInvitationOrganisation(
    invitationId,
    orgId,
    null,
    role,
    null,
  );
};

const getOrganisationAndServiceForInvitation = async (invitationId) => {
  return await invitation.getInvitationResponseById(invitationId);
};

const getOrganisationById = async (orgId) => {
  return await organisation.getOrganisation(orgId);
};

const getOrganisationAndServiceForUserV2 = async (userId) => {
  return await organisation.getOrganisationsForUserIncludingServices(userId);
};

const getAllRequestsForApprover = async (userId, correlationId) => {
  return callApi(
    "GET",
    `/organisations/requests-for-approval/${userId}`,
    correlationId,
  );
};

const getRequestsForOrganisation = async (organisationId, correlationId) => {
  return callApi(
    "GET",
    `/organisations/${organisationId}/requests`,
    correlationId,
  );
};

const getRequestsForOrganisations = async (organisationIds, correlationId) => {
  return callApi(
    "GET",
    `/organisations/${organisationIds}/requests/all`,
    correlationId,
  );
};

const getAllRequestsTypesForApprover = async (
  uid,
  pageSize,
  pageNumber,
  correlationId,
) => {
  return callApi(
    "GET",
    `/organisations/org-service-subService-requests-for-approval/${uid}?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    correlationId,
  );
};
const getNonPagedRequestsTypesForApprover = async (uid, correlationId) => {
  return callApi(
    "GET",
    `/organisations/org-service-subService-requests-for-approval/${uid}`,
    correlationId,
  );
};
const getRequestById = async (...args) => {
  const { dataValues, ...request } =
    await organisation.getUserOrganisationRequest(...args);
  return {
    ...dataValues,
    ...request,
    org_id: dataValues.organisation_id,
    org_name: dataValues.Organisation.name,
  };
};

const updateRequestById = async (
  requestId,
  status,
  actionedBy,
  actionedReason,
  actionedAt,
) => {
  const body = {};
  if (status) {
    body.status = status;
  }
  if (actionedBy) {
    body.actioned_by = actionedBy;
  }
  if (actionedReason) {
    body.actioned_reason = actionedReason;
  }
  if (actionedAt) {
    body.actioned_at = actionedAt;
  }

  const rowsUpdated = await organisation.updateUserOrganisationRequest(
    requestId,
    body,
  );
  if (rowsUpdated === 0) throw new Error("ENOTFOUND");
};

const getPendingRequestsAssociatedWithUser = async (userId) => {
  const pendingRequests =
    await organisation.getPendingUserOrganisationRequestsForUser(userId);
  return pendingRequests;
};

const getApproversForOrganisation = async (orgId, correlationId) => {
  return callApi("GET", `organisations/${orgId}/approvers`, correlationId);
};

const getLatestRequestAssociatedWithUser = async (userId, correlationId) => {
  return callApi(
    "GET",
    `/organisations/latest-request-for-user/${userId}`,
    correlationId,
  );
};

const getCategories = async () => {
  return callApi("GET", "/organisations/categories");
};

module.exports = {
  getOrganisationAndServiceForUser,
  getOrganisationUsersForApproval,
  putUserInOrganisation,
  deleteUserOrganisation,
  deleteInvitationOrganisation,
  putInvitationInOrganisation,
  getOrganisationAndServiceForInvitation,
  getOrganisationById,
  getOrganisationAndServiceForUserV2,
  getAllRequestsForApprover,
  getNonPagedRequestsTypesForApprover,
  getRequestsForOrganisation,
  getRequestsForOrganisations,
  getRequestById,
  updateRequestById,
  getPendingRequestsAssociatedWithUser,
  getApproversForOrganisation,
  getLatestRequestAssociatedWithUser,
  getCategories,
  getAllRequestsTypesForApprover,
};
