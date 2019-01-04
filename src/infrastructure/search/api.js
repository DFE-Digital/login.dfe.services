const config = require('./../config');
const KeepAliveAgent = require('agentkeepalive').HttpsAgent;
const rp = require('login.dfe.request-promise-retry').defaults({
  agent: new KeepAliveAgent({
    maxSockets: config.hostingEnvironment.agentKeepAlive.maxSockets,
    maxFreeSockets: config.hostingEnvironment.agentKeepAlive.maxFreeSockets,
    timeout: config.hostingEnvironment.agentKeepAlive.timeout,
    keepAliveTimeout: config.hostingEnvironment.agentKeepAlive.keepAliveTimeout,
  }),
});
const jwtStrategy = require('login.dfe.jwt-strategies');

const getAllUsersForOrg = async (page, orgId, correlationId) => {
  const token = await jwtStrategy(config.search.service).getBearerToken();
  try {
    return await rp({
      method: 'GET',
      uri: `${config.search.service.url}/users/?page=${page}&filter_organisations=${orgId}`,
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

const updateIndex = async (userId, organisations, email, correlationId) => {
  const token = await jwtStrategy(config.search.service).getBearerToken();
  try {
    const body = {};
    if (organisations) {
      body.organisations = organisations;
    }
    if (email) {
      body.email = email;
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

module.exports = {
  getAllUsersForOrg,
  getById,
  updateIndex,
};
