const applications = [];

const getApplication = async (idOrClientId, correlationId) => {
  return applications.find(a => a.id.toLowerCase() === idOrClientId.toLowerCase() || (a.relyingParty && a.relyingParty.clientId.toLowerCase() === idOrClientId.toLowerCase()));
};

const getAllServices = async () => {
  return Promise.resolve([]);
};

module.exports = {
  getApplication,
  getAllServices,
};
