const fs = require('fs');
const os = require('os');
const path = require('path');

const config = {
  loggerSettings: {
    logLevel: "debug",
    applicationName: "Services",
    auditDb: {
      host: process.env.PLATFORM_GLOBAL_SERVER_NAME,
      username: process.env.SVC_SIGNIN_ADT,
      password: process.env.SVC_SIGNIN_ADTPASSWORD,
      dialect: "mssql",
      name: process.env.PLATFORM_GLOBAL_AUDITDATABASE_NAME,
      encrypt: true,
      schema: "dbo",
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  },
  hostingEnvironment: {
    useDevViews: false,
    env: "azure",
    host: process.env.STANDALONE_SERVICES_HOST_NAME,
    hstsMaxAge: 86400,
    port: 443,
    protocol: "https",
    sessionSecret: process.env.SESSION_ENCRYPTION_SECRET_SVC,
    gaTrackingId: process.env.GOOGLE_ANALYTICS_ID,
    serviceId: process.env.SERVICE_ID,
    profileUrl: "https://" + process.env.STANDALONE_PROFILE_HOST_NAME,
    interactionsUrl: "https://" + process.env.STANDALONE_INTERACTIONS_HOST_NAME,
    helpUrl: "https://" + process.env.STANDALONE_HELP_HOST_NAME,
    helpAssistantUrl: process.env.HELP_ASSISTANT_URL,
    supportUrl: "https://" + process.env.STANDALONE_SUPPORT_HOST_NAME,
    surveyUrl: process.env.PLATFORM_GLOBAL_USER_FEEDBACK_URL,
    applicationInsights: process.env.APP_INSIGHTS_INSTRUMENTATION_KEY,
    sessionCookieExpiryInMinutes: 20,
    agentKeepAlive: {
      maxSockets: 30,
      maxFreeSockets: 10,
      timeout: 60000,
      keepAliveTimeout: 30000
    },
    environmentBannerMessage: process.env.ENVIRONMENT_BANNER_MESSAGE
  },
  directories: {
    type: "api",
    service: {
      url: "https://" + process.env.STANDALONE_DIRECTORIES_HOST_NAME,
      auth: {
        type: "aad",
        tenant: process.env.PLATFORM_GLOBAL_TENANTDOMAIN,
        authorityHostUrl: process.env.TENANT_URL,
        clientId: process.env.AAD_SHD_CLIENT_ID,
        clientSecret: process.env.AAD_SHD_CLIENT_SECRET,
        resource: process.env.AAD_SHD_APP_ID
      }
    }
  },
  organisations: {
    type: "api",
    service: {
      url: "https://" + process.env.STANDALONE_ORGANISATIONS_HOST_NAME,
      auth: {
        type: "aad",
        tenant: process.env.PLATFORM_GLOBAL_TENANTDOMAIN,
        authorityHostUrl: process.env.TENANT_URL,
        clientId: process.env.AAD_SHD_CLIENT_ID,
        clientSecret: process.env.AAD_SHD_CLIENT_SECRET,
        resource: process.env.AAD_SHD_APP_ID
      }
    }
  },
  access: {
    type: "api",
    service: {
      url: "https://" + process.env.STANDALONE_ACCESS_HOST_NAME,
      auth: {
        type: "aad",
        tenant: process.env.PLATFORM_GLOBAL_TENANT_DOMAIN,
        authorityHostUrl: process.env.TENANT_URL,
        clientId: process.env.AAD_SHD_CLIENT_ID,
        clientSecret: process.env.AAD_SHD_CLIENT_SECRET,
        resource: process.env.AAD_SHD_APP_ID
      }
    }
  },
  applications: {
    type: "api",
    service: {
      url: "https://" + process.env.STANDALONE_APPLICATIONS_HOST_NAME,
      auth: {
        type: "aad",
        tenant: process.env.PLATFORM_GLOBAL_TENANTDOMAIN,
        authorityHostUrl: process.env.TENANT_URL,
        clientId: process.env.AAD_SHD_CLIENT_ID,
        clientSecret: process.env.AAD_SHD_CLIENT_SECRET,
        resource: process.env.AAD_SHD_APP_ID
      }
    }
  },
  search: {
    type: "api",
    service: {
      url: "https://" + process.env.STANDALONE_SEARCH_HOST_NAME,
      auth: {
        type: "aad",
        tenant: process.env.PLATFORM_GLOBAL_TENANT_DOMAIN,
        authorityHostUrl: process.env.TENANT_URL,
        clientId: process.env.AAD_SHD_CLIENT_ID,
        clientSecret: process.env.AAD_SHD_CLIENT_SECRET,
        resource: process.env.AAD_SHD_APP_ID
      }
    }
  },
  database: {
    host: process.env.PLATFORM_GLOBAL_SERVER_NAME,
    username: process.env.SVC_SIGNIN_ORG,
    password: process.env.SVC_SIGNIN_ORGPASSWORD,
    dialect: "mssql",
    name: process.env.PLATFORM_GLOBAL_ORGANISATIONSDATABASE_NAME,
    encrypt: true,
    schema: "dbo",
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  identifyingParty: {
    url: "https://" + process.env.STANDALONE_OIDC_HOST_NAME,
    clientId: process.env.IDENTIFYING_PARTY_ID,
    clientSecret: process.env.IDENTIFYING_PARTY_SECRET,
    clockTolerance: 300
  },
  toggles: {
    generateUserOrgIdentifiers: true,
    useApproverJourney: true,
    environmentName: process.env.ENVIRONMENT_NAME
  },
  notifications: {
    connectionString: process.env.REDIS_CONN + "/4?tls=true"
  },
  organisationRequests: {
    requestLimit: 30
  },
  adapter: {
    type: "sequelize",
    directories: {
      host: process.env.PLATFORM_GLOBAL_SERVER_NAME,
      username: process.env.SVC_SIGNIN_DIR,
      password: process.env.SVC_SIGNIN_DIR_PASSWORD,
      dialect: "mssql",
      name: process.env.PLATFORM_GLOBAL_DIRECTORIES_DATABASE_NAME,
      encrypt: true,
      schema: "dbo",
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    },
    organisation: {
      host: process.env.PLATFORM_GLOBAL_SERVER_NAME,
      username: process.env.SVC_SIGNIN_ORG,
      password: process.env.SVC_SIGNIN_ORG_PASSWORD,
      dialect: "mssql",
      name: process.env.PLATFORM_GLOBAL_ORGANISATIONS_DATABASE_NAME,
      encrypt: true,
      schema: "dbo",
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  },
  cookieSessionRedis: {
    type: "redis",
    params: {
      connectionString: process.env.REDIS_CONN + "/3?tls=true"
    }
  },
  assets: {
    url: process.env.CDN_HOST_NAME,
    version: process.env.CDN_ASSETS_VERSION
  }
};

// Persist configuration to a temporary file and then point the `settings` environment
// variable to the path of the temporary file. The `login.dfe.dao` package can then load
// this configuration.
function mimicLegacySettings(config) {
  // TODO: This can be improved by refactoring the `login.dfe.dao` package.
  const tempDirectoryPath = fs.mkdtempSync(path.join(os.tmpdir(), 'config-'));
  const tempConfigFilePath = path.join(tempDirectoryPath, 'config.json');

  fs.writeFileSync(tempConfigFilePath, JSON.stringify(config), { encoding: 'utf8' });
  process.env.settings = tempConfigFilePath;
}

mimicLegacySettings(config);

module.exports = config;