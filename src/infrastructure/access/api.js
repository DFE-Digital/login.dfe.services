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

const callApi = async (method, endpoint, correlationId, body) => {
  const token = await jwtStrategy(config.access.service).getBearerToken();

  try {
    return await rp({
      method,
      uri: `${config.access.service.url}/${endpoint}`,
      headers: {
        authorization: `bearer ${token}`,
        'x-correlation-id': correlationId,
      },
      body: body,
      json: true,
    });
  } catch (e) {
    const status = e.statusCode ? e.statusCode : 500;
    if (status === 401 || status === 404) {
      return undefined;
    }
    if (status === 409) {
      return false;
    }
    throw e;
  }
};


const getServicesForUser = async (id, correlationId) => {
  return callApi('GET', `/users/${id}/services`, undefined, correlationId);
};

const getServicesForInvitation = async (iid, correlationId) => {
  return callApi('GET', `/invitations/${iid}/services`, undefined, correlationId)
};


const getSingleUserService = async (id, sid, oid, correlationId) => {
  return callApi('GET', `/users/${id}/services/${sid}/organisations/${oid}`, undefined, correlationId);
};

const getSingleInvitationService = async (iid, sid, oid, correlationId) => {
  return callApi('GET', `invitations/${iid}/services/${sid}/organisations/${oid}`, undefined, correlationId);
};

const listRolesOfService = async (sid, correlationId) => {
  return callApi('GET', `services/${sid}/roles`, undefined, correlationId);
};

const removeServiceFromUser = async (uid, sid, oid, correlationId) => {
  return callApi('DELETE', `users/${uid}/services/${sid}/organisations/${oid}`, undefined, correlationId);
};

module.exports = {
  getServicesForUser,
  getServicesForInvitation,
  getSingleUserService,
  getSingleInvitationService,
  listRolesOfService,
  removeServiceFromUser,
};
