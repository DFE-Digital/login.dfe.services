const config = require('./../config');
const jwtStrategy = require('login.dfe.jwt-strategies');
const KeepAliveAgent = require('agentkeepalive').HttpsAgent;
const rp = require('request-promise').defaults({
  agent: new KeepAliveAgent({
    maxSockets: config.hostingEnvironment.agentKeepAlive.maxSockets,
    maxFreeSockets: config.hostingEnvironment.agentKeepAlive.maxFreeSockets,
    timeout: config.hostingEnvironment.agentKeepAlive.timeout,
    keepAliveTimeout: config.hostingEnvironment.agentKeepAlive.keepAliveTimeout,
  }),
});

const callApi = async (method, path, correlationId, body) => {
  const token = await jwtStrategy(config.hotConfig.service).getBearerToken();

  const hasSeperator = (config.hotConfig.service.url.endsWith('/') && !path.startsWith('/'))
    || (!config.hotConfig.service.url.endsWith('/') && path.startsWith('/'));
  const basePathSeperator = hasSeperator ? '' : '/';
  const opts = {
    method,
    uri: `${config.hotConfig.service.url}${basePathSeperator}${path}`,
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

const getOidcClients = async (correlationId) => {
  return callApi('GET', `/oidcclients`, correlationId);
};

module.exports = {
  getOidcClients,
};
