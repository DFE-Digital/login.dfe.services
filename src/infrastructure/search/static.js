const getAllUsersForOrg = async (page, orgId, pageSize, correlationId) => {
  return Promise.resolve([]);
};

const getById = async (userId, correlationId) => {
  return Promise.resolve([]);
};

const updateIndex = async (userId, organisations, email, correlationId) => {
  return Promise.resolve();
};

module.exports = {
  getAllUsersForOrg,
  getById,
  updateIndex,
};
