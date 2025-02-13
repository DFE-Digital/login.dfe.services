const appCache = require("./AppCache");
const logger = require("../logger/index");
const { getAllServices } = require("../applications/api");

exports.checkCacheForAllServices = async (correlationId) => {
  const allServicesId = "allServices";
  let allServices = appCache.retrieve(allServicesId);

  if (!allServices) {
    allServices = await getAllServices(correlationId);
    appCache.save(allServicesId, allServices);
    logger.info(`Adding ${allServicesId} to cache`);
  } else {
    logger.info(`${allServicesId} available in the cache`);
  }

  return allServices;
};
