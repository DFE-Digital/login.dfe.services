const config = require('./../config');
const rp = require('login.dfe.request-promise-retry');
const jwtStrategy = require('login.dfe.jwt-strategies');

const getAllUsersForOrg = async (page, orgIds, sortBy, sortDirection, correlationId) => {
  const token = await jwtStrategy(config.search.service).getBearerToken();
  try {
    let endpoint = `${config.search.service.url}/users`;
    return await rp({
      method: 'POST',
      uri: endpoint,
      headers: {
        authorization: `bearer ${token}`,
        'x-correlation-id': correlationId,
      },
      body: {
        page,
        filter_organisations: orgIds,
        sortBy,
        sortDirection,
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

const searchForUsers = async (criteria, page, sortBy, sortDirection, filters, searchFields, correlationId) => {
  const token = await jwtStrategy(config.search.service).getBearerToken();
  try {
    let endpoint = `${config.search.service.url}/users`;

    const results = await rp({
      method: 'POST',
      uri: `${endpoint}`,
      headers: {
        authorization: `bearer ${token}`,
        'x-correlation-id': correlationId,
      },
      body: {
        page,
        criteria,
        sortBy,
        sortDirection,
        searchFields,
        ...filters,
      },
      json: true,
    });

    return {
      numberOfPages: results.numberOfPages,
      totalNumberOfResults: results.totalNumberOfResults,
      users: results.users,
    };
  } catch (e) {
    throw new Error(`Error searching for users with criteria ${criteria} (page: ${page}) - ${e.message}`);
  }
};

const getById = async (userId, correlationId) => {
  const token = await jwtStrategy(config.search.service).getBearerToken();
  try {
    return await rp({
      method: 'GET',
      uri: `${config.search.service.url}/users/${userId}`,
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

const updateIndex = async (userId, organisations, email, services, correlationId) => {
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
    await rp({
      method: 'PATCH',
      uri: `${config.search.service.url}/users/${userId}`,
      headers: {
        authorization: `bearer ${token}`,
        'x-correlation-id': correlationId,
      },
      body,
      json: true,
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
    await rp({
      method: 'POST',
      uri: `${config.search.service.url}/users/update-index`,
      headers: {
        authorization: `bearer ${token}`,
        'x-correlation-id': correlationId,
      },
      body: {
        id,
      },
      json: true,
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
