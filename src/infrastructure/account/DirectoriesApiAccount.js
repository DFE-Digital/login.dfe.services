const Account = require('./Account');
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


const callDirectoriesApi = async (resource, body, method = 'POST') => {
  const token = await jwtStrategy(config.directories.service).getBearerToken();
  try {
    const opts = {
      method,
      uri: `${config.directories.service.url}/${resource}`,
      headers: {
        authorization: `bearer ${token}`,
      },
      json: true,
    };
    if (method === 'POST' || method === 'PATCH') {
      opts.body = body;
    }
    const result = await rp(opts);

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

class DirectoriesApiAccount extends Account {
  static fromContext(user) {
    return new DirectoriesApiAccount(user);
  }

  static async getById(id) {
    const response = await callDirectoriesApi(`users/${id}`, null, 'GET');
    if (!response.success) {
      if (response.statusCode === 404) {
        return null;
      }
      throw new Error(response.errorMessage);
    }
    return new DirectoriesApiAccount(response.result);
  }

  static async getInvitationByEmail (email) {
    const response = await callDirectoriesApi(`invitations/by-email/${email}`, null, 'GET');
    if (!response.success) {
      if (response.statusCode === 404) {
        return null;
      }
      throw new Error(response.errorMessage);
    }
    return response.result;
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
    const response = await callDirectoriesApi(`users/${uid}/changepassword`, {
      password,
    });
    if (!response.success) {
      throw new Error(response.errorMessage);
    }
  }

  static async getUsersById(ids) {
    const response = await callDirectoriesApi(`users/by-ids?id=${ids.toString()}`, null, 'GET');
    if (!response.success) {
      if (response.statusCode === 404) {
        return null;
      }
      throw new Error(response.errorMessage);
    }
    return response.result.map(a => new DirectoriesApiAccount(a));
  }

  static async createInvite(firstName, lastName, email, clientId, redirectUri) {
    const response = await callDirectoriesApi(`invitations`, {
      firstName,
      lastName,
      email,
      origin: {
        clientId,
        redirectUri,
      },
    });
    if (!response.success) {
      if (response.statusCode === 404) {
        return null;
      }
      throw new Error(response.errorMessage);
    }
    return response.result.id;
  }

  static async updateInvite(id, email) {
    const response = await callDirectoriesApi(`invitations/${id}`, {
      email,
    }, 'PATCH');
    if (!response.success) {
      if (response.statusCode === 404) {
        return null;
      }
      throw new Error(response.errorMessage);
    }
    return true;
  }

  static async resendInvitation(id) {
    const response = await callDirectoriesApi(`invitations/${id}/resend`);

    if(!response.success){
      if (response.statusCode === 404) {
        return null;
      }
      throw new Error(response.errorMessage);
    }
    return true;
  }
}

module.exports = DirectoriesApiAccount;
