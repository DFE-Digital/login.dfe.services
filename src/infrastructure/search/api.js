const config = require('./../config');
const rp = require('login.dfe.request-promise-retry');
const jwtStrategy = require('login.dfe.jwt-strategies');

const getAllUsersForOrg = async (page, orgId, sortBy, sortDirection, correlationId) => {
  const token = await jwtStrategy(config.search.service).getBearerToken();
  try {
    let endpoint = `${config.search.service.url}/users/?page=${page}&filter_organisations=${orgId}`;
    if (sortBy) {
      endpoint += `&sortBy=${sortBy}`;
    }
    if (sortDirection) {
      endpoint += `&sortDirection=${sortDirection}`;
    }
    return await rp({
      method: 'GET',
      uri: endpoint,
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
  getById,
  updateIndex,
  createIndex,
};
