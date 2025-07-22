const getOrganisationAndServiceForUser = async () => {
  return Promise.resolve([]);
};

const getOrganisationAndServiceForUserV2 = async () => {
  return Promise.resolve([]);
};

const getOrganisationAndServiceForInvitation = async () => {
  return Promise.resolve([]);
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

const getRequestById = async () => {
  return Promise.resolve();
};

const updateRequestById = async () => {
  return Promise.resolve();
};

const getPendingRequestsAssociatedWithUser = async () => {
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
  putUserInOrganisation,
  deleteInvitationOrganisation,
  deleteUserOrganisation,
  putInvitationInOrganisation,
  getOrganisationAndServiceForInvitation,
  getOrganisationById,
  getOrganisationAndServiceForUserV2,
  getRequestById,
  updateRequestById,
  getPendingRequestsAssociatedWithUser,
  getCategories,
  getAllRequestsTypesForApprover,
};
