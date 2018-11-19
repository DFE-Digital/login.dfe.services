const getServicesForUser = async(id, correlationId) => {
  return Promise.resolve([]);
};

const getServicesForInvitation = async(iid, correlationId) => {
  return Promise.resolve([]);
};

const getSingleUserService = async (id, sid, oid, correlationId) => {
  return Promise.resolve([]);
};

const getSingleInvitationService = async (iid, sid, oid, correlationId) => {
  return Promise.resolve([]);
};

const listRolesOfService = async (sid, correlationId) => {
  return Promise.resolve([]);
};

const removeServiceFromUser = async(uid, sid, oid, correlationId) => {
  return Promise.resolve();
};

const removeServiceFromInvitation = async(iid, sid, oid, correlationId) => {
  return Promise.resolve();
};

const updateUserService = async (uid, sid, oid, role, correlationId) => {
  return Promise.resolve(null);
};

const updateInvitationService = async (iid, sid, oid, role, correlationId) => {
  return Promise.resolve(null);
};

module.exports = {
  getServicesForUser,
  getServicesForInvitation,
  getSingleUserService,
  getSingleInvitationService,
  listRolesOfService,
  removeServiceFromUser,
  removeServiceFromInvitation,
  updateUserService,
  updateInvitationService,
};
