const getOrganisationAndServiceForUser = async () => {
  return Promise.resolve([]);
};

const getOrganisationAndServiceForUserV2 = async () => {
  return Promise.resolve([]);
};

const getOrganisationAndServiceForInvitation = async () => {
  return Promise.resolve([]);
};

const getOrganisationUsersForApproval = async () => {
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

const putUserInOrganisation = async () => {
  return Promise.resolve();
};

const getOrganisationById = async () => {
  return Promise.resolve({});
};

const deleteInvitationOrganisation = async () => {
  return Promise.resolve();
};

const deleteUserOrganisation = async () => {
  return Promise.resolve();
};

const putInvitationInOrganisation = async () => {
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

const createUserOrganisationRequest = async () => {
  return Promise.resolve();
};

const getAllRequestsForApprover = async () => {
  return Promise.resolve();
};

const getRequestsForOrganisation = async () => {
  return Promise.resolve();
};

const getRequestById = async () => {
  return Promise.resolve();
};

const updateRequestById = async () => {
  return Promise.resolve();
};

const getPendingRequestsAssociatedWithUser = async () => {
  return Promise.resolve();
};

const getApproversForOrganisation = async () => {
  return Promise.resolve();
};

const getLatestRequestAssociatedWithUser = async () => {
  return Promise.resolve();
};

const getCategories = async () => {
  return Promise.resolve();
};

const getAllRequestsTypesForApprover = async () => {
  return Promise.resolve();
};

module.exports = {
  getOrganisationAndServiceForUser,
  getOrganisationUsersForApproval,
  putUserInOrganisation,
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
