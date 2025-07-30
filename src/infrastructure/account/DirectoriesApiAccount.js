const Account = require("./Account");
const { directories, invitation } = require("login.dfe.dao");

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
    let entity = await invitation.findInvitationForEmail(email, true);
    let mappedEntity = mapInvitationEntity(entity);
    return mappedEntity;
  }

  async setPassword(password) {
    const uid = this.claims.sub;
    return await directories.changePassword(uid, password);
  }

  static async getUsersById(ids) {
    let idList = [];

    if (Array.isArray(ids)) {
      idList = ids;
    } else {
      idList = ids.split(",");
    }

    let users = await directories.getUsers(idList);
    return users.map((a) => new DirectoriesApiAccount(a));
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
  }

  static async updateInvite(id, email) {
    await invitation.patchInvitation({ id: id, email: email });
    return true;
  }

  static async resendInvitation(id) {
    await invitation.resendInvitation(id);
    return true;
  }

  static async getInvitationById(id) {
    let entity = await invitation.getInvitationById(id);
    let mappedEntity = mapInvitationEntity(entity);
    return mappedEntity;
  }
}

module.exports = DirectoriesApiAccount;
