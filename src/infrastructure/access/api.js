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

const callApi = async (method, path, correlationId, body) => {
  const token = await jwtStrategy(config.access.service).getBearerToken();

  const hasSeperator = (config.access.service.url.endsWith('/') && !path.startsWith('/'))
    || (!config.access.service.url.endsWith('/') && path.startsWith('/'));
  const basePathSeperator = hasSeperator ? '' : '/';
  const opts = {
    method,
    uri: `${config.access.service.url}${basePathSeperator}${path}`,
    headers: {
      authorization: `bearer ${token}`,
      'x-correlation-id':
      correlationId,
    },
    json: true,
  };
  if (body && (method === 'POST' || method !== 'PUT' || method !== 'PATCH')) {
    opts.body = body;
  }
  return rp(opts);
};


const getServicesForUser = async (id, correlationId) => {
  return callApi('GET', `/users/${id}/services`, correlationId);
};

const getServicesForInvitation = async (iid, correlationId) => {
  return callApi('GET', `/invitations/${iid}/services`, correlationId)
};


const getSingleUserService = async (id, sid, oid, correlationId) => {
  return callApi('GET', `/users/${id}/services/${sid}/organisations/${oid}`, correlationId);
};

const getSingleInvitationService = async (iid, sid, oid, correlationId) => {
  return callApi('GET', `invitations/${iid}/services/${sid}/organisations/${oid}`, correlationId);
};

const listRolesOfService = async (sid, correlationId) => {
  return callApi('GET', `services/${sid}/roles`, correlationId);
};

const removeServiceFromUser = async (uid, sid, oid, correlationId) => {
  return callApi('DELETE', `users/${uid}/services/${sid}/organisations/${oid}`, correlationId);
};

module.exports = {
  getServicesForUser,
  getServicesForInvitation,
  getSingleUserService,
  getSingleInvitationService,
  listRolesOfService,
  removeServiceFromUser,
};
