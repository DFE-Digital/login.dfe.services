const Account = require('./Account');
const config = require('./../config');
const { fetchApi } = require('login.dfe.async-retry');
const jwtStrategy = require('login.dfe.jwt-strategies');
const { directories, invitation } = require('login.dfe.dao');

const callDirectoriesApi = async (resource, body, method = 'POST') => {
  const token = await jwtStrategy(config.directories.service).getBearerToken();
  try {
    const opts = {
      method,
      headers: {
        authorization: `bearer ${token}`,
      },
    };
    if (method === 'POST' || method === 'PATCH') {
      opts.body = body;
    }
    const result = await fetchApi(`${config.directories.service.url}/${resource}`, opts);

    return {
      success: true,
      result,
    };
  } catch (e) {
    return {
      success: false,
      statusCode: e.statusCode,
      errorMessage: e.message,
    };
  }
};

const mapInvitationEntity = (entity) => {
  if (!entity) {
    return entity;
  }

  const overrides =
    entity.overrideSubject || entity.overrideBody
      ? {
          subject: entity.overrideSubject,
          body: entity.overrideBody,
        }
      : undefined;

  let callbacks;

  const origin =
    entity.originClientId || entity.originRedirectUri
      ? {
          clientId: entity.originClientId,
          redirectUri: entity.originRedirectUri,
        }
      : undefined;

  let device;

  if (entity.callbacks && entity.callbacks.length > 0) {
    callbacks = entity.callbacks.map((cbEntity) => ({
      sourceId: cbEntity.sourceId,
      callback: cbEntity.callbackUrl,
      clientId: cbEntity.clientId,
    }));
  }

  if (entity.devices && entity.devices.length > 0) {
    device = {
      type: entity.devices[0].deviceType,
      serialNumber: entity.devices[0].serialNumber,
    };
  }

  return {
    firstName: entity.firstName,
    lastName: entity.lastName,
    email: entity.email,
    origin,
    selfStarted: entity.selfStarted,
    callbacks,
    overrides,
    device,
    code: entity.code,
    id: entity.id,
    last_login: entity.last_login,
    deactivated: entity.deactivated,
    reason: entity.reason,
    isCompleted: entity.completed,
    userId: entity.uid,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    prev_login: entity.prev_login,
    isMigrated: entity.isMigrated,
    approverEmail: entity.approverEmail,
    orgName: entity.orgName,
    isApprover: entity.isApprover,
  };
};

class DirectoriesApiAccount extends Account {
  static fromContext(user) {
    return new DirectoriesApiAccount(user);
  }

  static async getById(id) {
    let user = await directories.getUser(id);
    return new DirectoriesApiAccount(user);
  }

  static async getByEmail(email) {
    let user = await directories.getUserByEmail(email);
    return new DirectoriesApiAccount(user);
  }

  static async getInvitationByEmail(email) {
    try {
      let entity = await invitation.findInvitationForEmail(email, true);
      let mappedEntity = mapInvitationEntity(entity);
      return mappedEntity;
    } catch (ex) {
      throw ex;
    }
  }

  async validatePassword(password) {
    const username = this.claims.email;
    const response = await callDirectoriesApi('users/authenticate', {
      username,
      password,
    });
    return response.success;
  }

  async setPassword(password) {
    const uid = this.claims.sub;
    try {
      return await directories.changePassword(uid, password);
    } catch (ex) {
      throw ex;
    }
  }

  static async getUsersById(ids) {
    let idList = [];

    if (Array.isArray(ids)) {
      idList = ids;
    } else {
      idList = ids.split(',');
    }

    try {
      let users = await directories.getUsers(idList);
      return users.map((a) => new DirectoriesApiAccount(a));
    } catch (ex) {
      throw ex;
    }
  }

  static async createInvite(
    firstName,
    lastName,
    email,
    originClientId,
    originRedirectUri,
    approverEmail,
    orgName,
    isApprover,
  ) {
    try {
      const response = await invitation.postInvitation({
        firstName,
        lastName,
        email,
        originClientId,
        originRedirectUri,
        approverEmail,
        orgName,
        isApprover,
      });
      return response ? response.id : null;
    } catch (ex) {
      throw ex;
    }
  }

  static async updateInvite(id, email) {
    try {
      await invitation.patchInvitation({ id: id, email: email });
      return true;
    } catch (ex) {
      throw ex;
    }
  }

  static async resendInvitation(id) {
    try {
      await invitation.resendInvitation(id);
      return true;
    } catch (ex) {
      throw ex;
    }
  }

  static async getInvitationById(id) {
    try {
      let entity = await invitation.getInvitationById(id);
      let mappedEntity = mapInvitationEntity(entity);
      return mappedEntity;
    } catch (ex) {
      throw ex;
    }
  }
}

module.exports = DirectoriesApiAccount;
