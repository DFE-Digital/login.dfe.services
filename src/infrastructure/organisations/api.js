const config = require('./../config');
const jwtStrategy = require('login.dfe.jwt-strategies');
const KeepAliveAgent = require('agentkeepalive').HttpsAgent;
const rp = require('login.dfe.request-promise-retry').defaults({
  agent: new KeepAliveAgent({
    maxSockets: config.hostingEnvironment.agentKeepAlive.maxSockets,
    maxFreeSockets: config.hostingEnvironment.agentKeepAlive.maxFreeSockets,
    timeout: config.hostingEnvironment.agentKeepAlive.timeout,
    keepAliveTimeout: config.hostingEnvironment.agentKeepAlive.keepAliveTimeout,
  }),
});

const callApi = async (method, path, correlationId, body) => {
  const token = await jwtStrategy(config.organisations.service).getBearerToken();

  const hasSeperator = (config.organisations.service.url.endsWith('/') && !path.startsWith('/'))
    || (!config.organisations.service.url.endsWith('/') && path.startsWith('/'));
  const basePathSeperator = hasSeperator ? '' : '/';
  const opts = {
    method,
    uri: `${config.organisations.service.url}${basePathSeperator}${path}`,
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

const getOrganisationAndServiceForUser = async (userId, correlationId) => {
  return callApi('GET', `/organisations/associated-with-user/${userId}`, correlationId);
};

const getOrganisationUsersForApproval = async (userId, correlationId) => {
  return callApi('GET', `/organisations/users-for-approval/${userId}`, correlationId);
};

const putUserInOrganisation = async(userId, orgId, status, role, reason, correlationId) => {
  return callApi('PUT', `/organisations/${orgId}/users/${userId}`, correlationId, {roleId:role, status, reason});
};

const getAllUsersForOrganisation = async (orgId, correlationId) => {
  return callApi('GET', `/organisations/${orgId}/users`, correlationId);
};

const getServiceById = async (serviceId, correlationId) => {
  return await callApi(`services/${serviceId}`, 'GET', undefined, correlationId);
};

const deleteUserOrganisation = async (userId, organisationId, correlationId)  => {
  return callApi('DELETE', `organisations/${organisationId}/users/${userId}`, correlationId);
};
const deleteInvitationOrganisation = async (invitationId, organisationId, correlationId) => {
  return callApi('DELETE', `organisations/${organisationId}/invitations/${invitationId}`, correlationId);
};

const putInvitationInOrganisation = async (invitationId, orgId, role, correlationId) => {
  return callApi('PUT', `/organisations/${orgId}/invitations/${invitationId}`, correlationId, {roleId: role});
};

const getOrganisationAndServiceForInvitation = async (invitationId, correlationId) => {
  return callApi('GET', `/invitations/v2/${invitationId}`, correlationId);
};

const getOrganisationById = async (orgId, correlationId) => {
  return callApi('GET', `organisations/${orgId}`, correlationId);
};




module.exports = {
  getOrganisationAndServiceForUser,
  getOrganisationUsersForApproval,
  putUserInOrganisation,
  getServiceById,
  getAllUsersForOrganisation,
  deleteUserOrganisation,
  deleteInvitationOrganisation,
  putInvitationInOrganisation,
  getOrganisationAndServiceForInvitation,
  getOrganisationById,
};
