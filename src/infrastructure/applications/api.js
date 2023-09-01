const config = require('./../config');
const rp = require('login.dfe.request-promise-retry');
const jwtStrategy = require('login.dfe.jwt-strategies');
const { services } = require('login.dfe.dao');

const getApplication = async (idOrClientId, correlationId) => {
  const token = await jwtStrategy(config.applications.service).getBearerToken();
  try {
    return await rp({
      method: 'GET',
      uri: `${config.applications.service.url}/services/${idOrClientId}`,
      headers: {
        authorization: `bearer ${token}`,
        'x-correlation-id': correlationId,
      },
      json: true,
    });
  } catch (e) {
    if (e.statusCode === 404) {
      return undefined;
    }
    throw e;
  }
};

const getPageOfService = async (pageNumber, pageSize) => {
  const pageOfServices = await services.list(pageNumber, pageSize);
  return !pageOfServices || pageOfServices.length === 0 ? undefined : pageOfServices;
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
  const statusFlags = await services.getToggleStatuses('email', 'services');
  if (statusFlags && statusFlags.length === 1) {
    return statusFlags[0].Flag;
  }
  return true;
};

module.exports = {
  getApplication,
  getAllServices,
  isServiceEmailNotificationAllowed,
};
