const {
  servicePostLogoutRedirects,
} = require("./../../infrastructure/repository/organisations");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const logger = require("./../../infrastructure/logger");

const getServicePostLogoutRedirectsUrl = async (serviceId) => {
  try {
    const entities = await servicePostLogoutRedirects.findAll({
      where: {
        serviceId: {
          [Op.eq]: serviceId,
        },
      },
      order: [["serviceId", "DESC"]],
    });
    if (!entities) {
      return null;
    }
    return await Promise.all(
      entities.map(async (entity) => ({
        serviceId: entity.getDataValue("serviceId"),
        redirectUrl: entity.getDataValue("redirectUrl"),
      })),
    );
  } catch (e) {
    logger.error(
      `error getting service post logout url for the service with ID [${serviceId}] - ${e.message}  error: ${e}`,
    );
    return await Promise.reject(e);
  }
};

module.exports = {
  getServicePostLogoutRedirectsUrl,
};
