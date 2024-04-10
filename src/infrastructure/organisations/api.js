const config = require('./../config');
const jwtStrategy = require('login.dfe.jwt-strategies');
const { fetchApi } = require('login.dfe.async-retry');
const { organisation, invitation, services } = require('login.dfe.dao');

const callApi = async (method, path, correlationId, body) => {
  const token = await jwtStrategy(config.organisations.service).getBearerToken();

  const hasSeperator =
    (config.organisations.service.url.endsWith('/') && !path.startsWith('/')) ||
    (!config.organisations.service.url.endsWith('/') && path.startsWith('/'));
  const basePathSeperator = hasSeperator ? '' : '/';
  const opts = {
    method,
    headers: {
      authorization: `bearer ${token}`,
      'x-correlation-id': correlationId,
    },
  };
  if (body && (method === 'POST' || method !== 'PUT' || method !== 'PATCH')) {
    opts.body = body;
  }
  return fetchApi(`${config.organisations.service.url}${basePathSeperator}${path}`, opts);
};

const getOrganisationAndServiceForUser = async (userId, correlationId) => {
  return await organisation.getOrganisationsForUserIncludingServices(userId);
};

const getOrganisationUsersForApproval = async (userId, correlationId) => {
  return callApi('GET', `/organisations/users-for-approval/${userId}`, correlationId);
};

const putUserInOrganisation = async (userId, orgId, status, role, reason, correlationId) => {
  const userOrg = {
    user_id: userId,
    organisation_id: orgId,
    role_id: role,
    status,
    reason,
  };
  return organisation.putUserOrganisation(userOrg);
};

const getAllUsersForOrganisation = async (orgId, correlationId) => {
  try {
    return await organisation.getUsersAssociatedWithOrganisation(orgId);
  } catch (ex) {
    throw ex;
  }
};

const deleteUserOrganisation = async (userId, organisationId, correlationId) => {
  return await organisation.deleteUserOrganisation(organisationId, userId);
};
const deleteInvitationOrganisation = async (invitationId, organisationId, correlationId) => {
  return await invitation.deleteInvitationOrganisation(organisationId, invitationId);
};

const putInvitationInOrganisation = async (invitationId, orgId, role, correlationId) => {
  return invitation.putInvitationOrganisation(invitationId, orgId, null, role, null);
};

const getOrganisationAndServiceForInvitation = async (invitationId, correlationId) => {
  return await invitation.getInvitationResponseById(invitationId);
};

const getOrganisationById = async (orgId) => {
  return await organisation.getOrganisation(orgId);
};

const getOrganisationAndServiceForUserV2 = async (userId, correlationId) => {
  return await organisation.getOrganisationsForUserIncludingServices(userId);
};

const searchOrganisations = async (
  criteria,
  pageNumber,
  filterCategories,
  filterStates,
  correlationId,
  filterOutOrgNames,
) => {
  let uri = `/organisations?search=${criteria}&page=${pageNumber}`;
  if (filterCategories && filterCategories.length > 0) {
    uri += `&filtercategory=${filterCategories.join('&filtercategory=')}`;
  }
  if (filterStates && filterStates.length > 0) {
    uri += `&filterstatus=${filterStates.join('&filterstatus=')}`;
  }
  if (filterOutOrgNames && filterOutOrgNames.length > 0) {
    uri += `&filterOutOrgNames=${filterOutOrgNames.join('&filterOutOrgNames=')}`;
  }
  return callApi('GET', uri, correlationId, undefined);
};

const createUserOrganisationRequest = async (userId, orgId, reason, correlationId) => {
  const request = await callApi('POST', `/organisations/${orgId}/users/${userId}/requests`, correlationId, { reason });
  return request;
};

const getAllRequestsForApprover = async (userId, correlationId) => {
  return callApi('GET', `/organisations/requests-for-approval/${userId}`, correlationId);
};

const getRequestsForOrganisation = async (organisationId, correlationId) => {
  return callApi('GET', `/organisations/${organisationId}/requests`, correlationId);
};

const getRequestsForOrganisations = async (organisationIds, correlationId) => {
  return callApi('GET', `/organisations/${organisationIds}/requests/all`, correlationId);
};

const getAllRequestsTypesForApprover = async (uid, pageSize, pageNumber, correlationId) => {
  return callApi(
    'GET',
    `/organisations/org-service-subService-requests-for-approval/${uid}?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    correlationId,
  );
};
const getNonPagedRequestsTypesForApprover = async (uid, correlationId) => {
  return callApi(
    'GET',
    `/organisations/org-service-subService-requests-for-approval/${uid}`,
    correlationId,
  );
};
const getRequestById = async (...args) => {
  const { dataValues, ...request } = await organisation.getUserOrganisationRequest(...args);
  return { ...dataValues, ...request, org_id: dataValues.organisation_id, org_name: dataValues.Organisation.name };
};



const updateRequestById = async (requestId, status, actionedBy, actionedReason, actionedAt) => {
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

  const rowsUpdated = await organisation.updateUserOrganisationRequest(requestId, body);
  if (rowsUpdated === 0) throw new Error('ENOTFOUND');
};

const getPendingRequestsAssociatedWithUser = async (userId, correlationId) => {
  const pendingRequests = await organisation.getPendingUserOrganisationRequestsForUser(userId);
  return pendingRequests;
};

const getApproversForOrganisation = async (orgId, correlationId) => {
  return callApi('GET', `organisations/${orgId}/approvers`, correlationId);
};

const getLatestRequestAssociatedWithUser = async (userId, correlationId) => {
  return callApi('GET', `/organisations/latest-request-for-user/${userId}`, correlationId);
};

const getCategories = async () => {
  return callApi('GET', '/organisations/categories');
};

module.exports = {
  getOrganisationAndServiceForUser,
  getOrganisationUsersForApproval,
  putUserInOrganisation,
  getAllUsersForOrganisation,
  deleteUserOrganisation,
  deleteInvitationOrganisation,
  putInvitationInOrganisation,
  getOrganisationAndServiceForInvitation,
  getOrganisationById,
  getOrganisationAndServiceForUserV2,
  searchOrganisations,
  createUserOrganisationRequest,
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
