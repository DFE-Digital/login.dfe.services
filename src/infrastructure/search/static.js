const getAllUsersForOrg = async (page, orgId, pageSize, correlationId) => {
  return Promise.resolve([]);
};

const getById = async (userId, correlationId) => {
  return Promise.resolve([]);
};

const updateIndex = async (
  userId,
  organisations,
  email,
  services,
  correlationId,
) => {
  return Promise.resolve();
};

const createIndex = async (id, correlationId) => {
  return Promise.resolve();
};

module.exports = {
  getAllUsersForOrg,
  getById,
  updateIndex,
  createIndex,
};
