const config = require("./../config");
const { fetchApi } = require("login.dfe.async-retry");
const jwtStrategy = require("login.dfe.jwt-strategies");

const getAllUsersForOrg = async (
  page,
  orgIds,
  sortBy,
  sortDirection,
  correlationId,
) => {
  const token = await jwtStrategy(config.search.service).getBearerToken();
  try {
    let endpoint = `${config.search.service.url}/users`;
    return await fetchApi(endpoint, {
      method: "POST",
      headers: {
        authorization: `bearer ${token}`,
        "x-correlation-id": correlationId,
      },
      body: {
        page,
        filter_organisations: orgIds,
        sortBy,
        sortDirection,
      },
    });
  } catch (e) {
    if (e.statusCode === 404) {
      return undefined;
    }
    throw e;
  }
};

const searchForUsers = async (
  criteria,
  page,
  sortBy,
  sortDirection,
  filters,
  searchFields,
  correlationId,
) => {
  const token = await jwtStrategy(config.search.service).getBearerToken();
  try {
    let endpoint = `${config.search.service.url}/users`;

    const results = await fetchApi(`${endpoint}`, {
      method: "POST",
      headers: {
        authorization: `bearer ${token}`,
        "x-correlation-id": correlationId,
      },
      body: {
        page,
        criteria,
        sortBy,
        sortDirection,
        searchFields,
        ...filters,
      },
    });

    return {
      numberOfPages: results.numberOfPages,
      totalNumberOfResults: results.totalNumberOfResults,
      users: results.users,
    };
  } catch (e) {
    throw new Error(
      `Error searching for users with criteria ${criteria} (page: ${page}) - ${e.message}`,
    );
  }
};

const getById = async (userId, correlationId) => {
  const token = await jwtStrategy(config.search.service).getBearerToken();
  try {
    return await fetchApi(`${config.search.service.url}/users/${userId}`, {
      method: "GET",
      headers: {
        authorization: `bearer ${token}`,
        "x-correlation-id": correlationId,
      },
    });
  } catch (e) {
    if (e.statusCode === 404) {
      return undefined;
    }
    throw e;
  }
};

const updateIndex = async (
  userId,
  organisations,
  email,
  services,
  correlationId,
) => {
  const token = await jwtStrategy(config.search.service).getBearerToken();
  try {
    const body = {};
    if (organisations) {
      body.organisations = organisations;
    }
    if (email) {
      body.email = email;
    }
    if (services) {
      body.services = services;
    }
    await fetchApi(`${config.search.service.url}/users/${userId}`, {
      method: "PATCH",
      headers: {
        authorization: `bearer ${token}`,
        "x-correlation-id": correlationId,
      },
      body,
    });
    return true;
  } catch (e) {
    if (e.statusCode === 404) {
      return undefined;
    }
    if (e.statusCode === 400) {
      return undefined;
    }
    throw e;
  }
};

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
  getAllUsersForOrg,
  searchForUsers,
  getById,
  updateIndex,
  createIndex,
};
