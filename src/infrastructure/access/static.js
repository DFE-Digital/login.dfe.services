const getSingleUserService = async () => {
  return Promise.resolve([]);
};

const getSingleInvitationService = async () => {
  return Promise.resolve([]);
};

const listRolesOfService = async () => {
  return Promise.resolve([]);
};

const removeServiceFromUser = async () => {
  return Promise.resolve();
};

const removeServiceFromInvitation = async () => {
  return Promise.resolve();
};

const updateUserService = async () => {
  return Promise.resolve(null);
};

const updateInvitationService = async () => {
  return Promise.resolve(null);
};

const addUserService = async () => {
  return Promise.resolve(null);
};

const addInvitationService = async () => {
  return Promise.resolve(null);
};

module.exports = {
  getSingleUserService,
  getSingleInvitationService,
  listRolesOfService,
  removeServiceFromUser,
  removeServiceFromInvitation,
  updateUserService,
  updateInvitationService,
  addInvitationService,
  addUserService,
};
