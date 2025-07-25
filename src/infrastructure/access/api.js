const config = require("./../config");

const { fetchApi } = require("login.dfe.async-retry");
const jwtStrategy = require("login.dfe.jwt-strategies");

const callApi = async (method, endpoint, correlationId, body) => {
  const token = await jwtStrategy(config.access.service).getBearerToken();

  try {
    return await fetchApi(`${config.access.service.url}/${endpoint}`, {
      method,
      headers: {
        authorization: `bearer ${token}`,
        "x-correlation-id": correlationId,
      },
      body: body,
    });
  } catch (e) {
    const status = e.statusCode ? e.statusCode : 500;
    if (status === 404) {
      return undefined;
    }
    throw e;
  }
};

const removeServiceFromInvitation = async (iid, sid, oid, correlationId) => {
  return callApi(
    "DELETE",
    `invitations/${iid}/services/${sid}/organisations/${oid}`,
    correlationId,
    undefined,
  );
};

const updateUserService = async (uid, sid, oid, roles, correlationId) => {
  const body = {
    roles,
  };
  return callApi(
    "PATCH",
    `/users/${uid}/services/${sid}/organisations/${oid}`,
    correlationId,
    body,
  );
};

const updateInvitationService = async (iid, sid, oid, roles, correlationId) => {
  const body = {
    roles,
  };
  return callApi(
    "PATCH",
    `/invitations/${iid}/services/${sid}/organisations/${oid}`,
    correlationId,
    body,
  );
};

const addUserService = async (uid, sid, oid, roles, correlationId) => {
  const body = {
    roles,
  };
  return callApi(
    "PUT",
    `users/${uid}/services/${sid}/organisations/${oid}`,
    correlationId,
    body,
  );
};

const addInvitationService = async (iid, sid, oid, roles, correlationId) => {
  const body = {
    roles,
  };
  return callApi(
    "PUT",
    `invitations/${iid}/services/${sid}/organisations/${oid}`,
    correlationId,
    body,
  );
};

module.exports = {
  removeServiceFromInvitation,
  updateUserService,
  updateInvitationService,
  addUserService,
  addInvitationService,
};
