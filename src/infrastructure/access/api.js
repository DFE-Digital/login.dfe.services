const config = require('./../config');
const KeepAliveAgent = require('agentkeepalive').HttpsAgent;
const rp = require('request-promise').defaults({
  agent: new KeepAliveAgent({
    maxSockets: config.hostingEnvironment.agentKeepAlive.maxSockets,
    maxFreeSockets: config.hostingEnvironment.agentKeepAlive.maxFreeSockets,
    timeout: config.hostingEnvironment.agentKeepAlive.timeout,
    keepAliveTimeout: config.hostingEnvironment.agentKeepAlive.keepAliveTimeout,
  }),
});
const jwtStrategy = require('login.dfe.jwt-strategies');

const getServicesForUser = async (id, correlationId) => {
  const token = await jwtStrategy(config.access.service).getBearerToken();
  try {
    return await rp({
      method: 'GET',
      uri: `${config.access.service.url}/users/${id}/services`,
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

const getServicesForInvitation = async (iid, correlationId) => {
  const token = await jwtStrategy(config.access.service).getBearerToken();
  try {
    return await rp({
      method: 'GET',
      uri: `${config.access.service.url}/invitations/${iid}/services`,
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

module.exports = {
  getServicesForUser,
  getServicesForInvitation,
};
