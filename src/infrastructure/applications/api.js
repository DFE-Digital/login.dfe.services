const { services } = require("login.dfe.dao");
const { getPaginatedServices } = require("login.dfe.api-client/services");

const getAllServices = async () => {
  const services = [];

  let pageNumber = 1;
  let numberOfPages = undefined;
  while (numberOfPages === undefined || pageNumber <= numberOfPages) {
    const result = await getPaginatedServices({ pageSize: 50, pageNumber });
    services.push(...result.services);

    numberOfPages = result.totalNumberOfPages;
    pageNumber += 1;
  }

  return { services };
};

const isServiceEmailNotificationAllowed = async () => {
  const statusFlags = await services.getToggleStatuses("email", "services");
  if (statusFlags && statusFlags.length === 1) {
    return statusFlags[0].Flag;
  }
  return true;
};

module.exports = {
  getAllServices,
  isServiceEmailNotificationAllowed,
};
