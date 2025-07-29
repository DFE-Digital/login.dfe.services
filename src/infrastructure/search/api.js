const config = require("./../config");
const { fetchApi } = require("login.dfe.async-retry");
const jwtStrategy = require("login.dfe.jwt-strategies");

const createIndex = async (id, correlationId) => {
  const token = await jwtStrategy(config.search.service).getBearerToken();
  try {
    await fetchApi(`${config.search.service.url}/users/update-index`, {
      method: "POST",
      headers: {
        authorization: `bearer ${token}`,
        "x-correlation-id": correlationId,
      },
      body: {
        id,
      },
    });
    return true;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 400 || e.statusCode === 403) {
      return undefined;
    }
    throw e;
  }
};

module.exports = {
  createIndex,
};
