const getOrganisationAndServiceForUser = async (userId, correlationId) => {
  return Promise.resolve([]);
};

const getOrganisationAndServiceForUserV2 = async (userId, correlationId) => {
  return Promise.resolve([]);
};

const getOrganisationAndServiceForInvitation = async (
  invitationId,
  correlationId,
) => {
  return Promise.resolve([]);
};

const getOrganisationUsersForApproval = async (userId) => {
  return Promise.resolve([
    {
      org_id: "60EEAA8D-D21D-44E9-BF10-6220E841FDAB",
      org_name: "Oxley Park Academy",
      user_id: "5B664F21-293B-41C3-85F7-A4BB8C9DC9EE",
      created_date: "2018-05-03T15:27:04.212Z",
      status: {
        id: 0,
        name: "Pending",
      },
    },
  ]);
};

const putUserInOrganisation = async (userId, orgId, role, correlationId) => {
  return Promise.resolve();
};

const getAllUsersForOrganisation = async (orgId, correlationId) => {
  return Promise.resolve([
    {
      id: "60EEAA8D-D21D-44E9-BF10-6220E841FDAB",
      status: 1,
      role: {
        id: 0,
        name: "End user",
      },
      numberOfPages: 1,
    },
  ]);
};

const getOrganisationById = async (orgId, correlationId) => {
  return Promise.resolve({});
};

const deleteInvitationOrganisation = async (
  invitationId,
  organisationId,
  correlationId,
) => {
  return Promise.resolve();
};

const deleteUserOrganisation = async (
  userId,
  organisationId,
  correlationId,
) => {
  return Promise.resolve();
};

const putInvitationInOrganisation = async (
  invitationId,
  orgId,
  role,
  correlationId,
) => {
  return Promise.resolve();
};

const getPageOfOrganisations = async (pageNumber) => {
  return Promise.resolve({
    organisations: [
      {
        id: "83f00ace-f1a0-4338-8784-fa14f5943e5a",
        name: "Some service",
      },
    ],
    page: pageNumber,
    totalNumberOfPages: 1,
  });
};

const searchOrganisations = async (
  criteria,
  pageNumber,
  filterCategories,
  filterStates,
  correlationId,
) => {
  return getPageOfOrganisations(pageNumber, correlationId);
};

const createUserOrganisationRequest = async (
  userId,
  orgId,
  reason,
  correlationId,
) => {
  return Promise.resolve();
};

const getAllRequestsForApprover = async (userId, correlationId) => {
  return Promise.resolve();
};

const getRequestsForOrganisation = async (organisationId, correlationId) => {
  return Promise.resolve();
};

const getRequestById = async (requestId, correlationId) => {
  return Promise.resolve();
};

const updateRequestById = async (
  requestId,
  status,
  actionedBy,
  actionedReason,
  actionedAt,
  correlationId,
) => {
  return Promise.resolve();
};

const getPendingRequestsAssociatedWithUser = async (userId, correlationId) => {
  return Promise.resolve();
};

const getApproversForOrganisation = async (organisationId, correlationId) => {
  return Promise.resolve();
};

const getLatestRequestAssociatedWithUser = async (userId, correlationId) => {
  return Promise.resolve();
};

const getCategories = async () => {
  return Promise.resolve();
};

const getAllRequestsTypesForApprover = async (
  userId,
  pageSize,
  pageNumber,
  correlationId,
) => {
  return Promise.resolve();
};

module.exports = {
  getOrganisationAndServiceForUser,
  getOrganisationUsersForApproval,
  putUserInOrganisation,
  getAllUsersForOrganisation,
  deleteInvitationOrganisation,
  deleteUserOrganisation,
  putInvitationInOrganisation,
  getOrganisationAndServiceForInvitation,
  getOrganisationById,
  getOrganisationAndServiceForUserV2,
  searchOrganisations,
  createUserOrganisationRequest,
  getAllRequestsForApprover,
  getRequestsForOrganisation,
  getRequestById,
  updateRequestById,
  getPendingRequestsAssociatedWithUser,
  getApproversForOrganisation,
  getLatestRequestAssociatedWithUser,
  getCategories,
  getAllRequestsTypesForApprover,
};
