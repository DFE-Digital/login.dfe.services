const { services } = require("login.dfe.dao");

const getPageOfService = async (pageNumber, pageSize) => {
  const pageOfServices = await services.list(pageNumber, pageSize);
  return !pageOfServices || pageOfServices.length === 0
    ? undefined
    : pageOfServices;
};

const getAllServices = async () => {
  const services = [];

  let pageNumber = 1;
  let numberOfPages = undefined;
  while (numberOfPages === undefined || pageNumber <= numberOfPages) {
    const { count, rows } = await getPageOfService(pageNumber, 50);
    services.push(...rows);

    numberOfPages = Math.ceil(count / 50);
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
