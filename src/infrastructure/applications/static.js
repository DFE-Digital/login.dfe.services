const applications = [];

const getApplication = async (idOrClientId) => {
  return applications.find(
    (a) =>
      a.id.toLowerCase() === idOrClientId.toLowerCase() ||
      (a.relyingParty &&
        a.relyingParty.clientId.toLowerCase() === idOrClientId.toLowerCase()),
  );
};

const getAllServices = async () => {
  return Promise.resolve([]);
};

const isServiceEmailNotificationAllowed = async () => {
  return Promise.resolve([]);
};

module.exports = {
  getApplication,
  getAllServices,
  isServiceEmailNotificationAllowed,
};
