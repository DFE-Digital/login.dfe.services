const { organisation, invitation } = require("login.dfe.dao");

const getOrganisationAndServiceForUser = async (userId) => {
  return await organisation.getOrganisationsForUserIncludingServices(userId);
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

module.exports = {
  getOrganisationAndServiceForUser,
  putUserInOrganisation,
  deleteUserOrganisation,
  deleteInvitationOrganisation,
  putInvitationInOrganisation,
  getOrganisationAndServiceForInvitation,
  getOrganisationById,
  getOrganisationAndServiceForUserV2,
  getRequestById,
  updateRequestById,
  getPendingRequestsAssociatedWithUser,
};
