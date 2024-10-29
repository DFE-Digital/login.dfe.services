'use strict';

const mockConfig = () => {
  return {
    hostingEnvironment: {
      env: 'test-run',
      serviceId: '28388aeb-431b-49bc-9480-8db1b0bdd6e1',
      host: 'localhost',
      port: '3000',
      helpUrl: 'https://localhost:3001/help',
    },
    loggerSettings: {},
    organisations: {
      type: 'static',
    },
    access: {
      type: 'static',
    },
    search: {
      type: 'static',
    },
    applications: {
      type: 'static',
    },
    directories: {
      type: 'static',
    },
    notifications: {
      connectionString: 'test',
    },
    organisationRequests: {
      requestLimit: 3,
    },
    toggles: {
      useApproverJourney: true,
      environmentName: 'pr',
    },
    database: {
      host: 'host',
      username: 'user',
      password: 'password',
      dialect: 'mssql',
      name: 'db',
      encrypt: true,
      schema: 'dbo',
      pool: {
        max: 100,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    },
  };
};

const mockAdapterConfig = () => {
  return {
    organisations: {
      type: 'api',
    },
    access: {
      type: 'static',
    },
    search: {
      type: 'static',
    },
    applications: {
      type: 'static',
    },
    directories: {
      type: 'static',
      service: {
        url: 'http://unit.test.local',
      },
    },
    toggles: {
      useApproverJourney: true,
    },
    hostingEnvironment: {
      helpUrl: 'https://localhost:3001/help',
      helpAssistantUrl: 'https://localhost:3001/chatBot',
    },
    loggerSettings: {},
    notifications: {},
    adapter: {
      type: 'sequelize',
      directories: {
        host: 'host',
        username: 'user',
        password: 'pass',
        dialect: 'mssql',
        name: 'db-name',
        encrypt: true,
        schema: 'dbo',
        pool: {
          max: 100,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      },
      organisation: {
        host: 'host',
        username: 'user',
        password: 'pass',
        dialect: 'mssql',
        name: 'db-name',
        encrypt: true,
        schema: 'dbo',
        pool: {
          max: 100,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      },
    },
  };
};

const mockLogger = () => {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    audit: jest.fn(),
  };
};

const mockRequest = (customRequest = {}) => {
  return Object.assign(
    {
      params: {
        uuid: '123-abc',
      },
      id: 'correlationId',
      session: {},
      body: {},
      query: {},
      csrfToken: jest.fn().mockReturnValue('token'),
      isAuthenticated: jest.fn().mockReturnValue(true),
    },
    customRequest,
  );
};
const mockResponse = () => {
  return {
    render: jest.fn(),
    redirect: jest.fn(),
    sessionRedirect: jest.fn(),
    flash: jest.fn(),
    mockResetAll: function () {
      this.render.mockReset().mockReturnValue(this);
      this.redirect.mockReset().mockReturnValue(this);
      this.sessionRedirect.mockReset().mockReturnValue(this);
      this.flash.mockReset().mockReturnValue(this);
    },
  };
};

const mockDao = () => {
  return {
    services: {
      list: async (pageNumber, pageSize) => {
        return {
          count: 10,
          rows: [
            {
              id: 'service1',
              isExternalService: true,
              isMigrated: true,
              name: 'Service One',
            },
            {
              id: 'service2',
              isExternalService: true,
              isMigrated: true,
              name: 'Service two',
            },
          ],
        };
      },
      getById: async (sid) => {
        return {
          id: 'service-id',
          name: 'Test Service',
        };
      },
    },
  };
};

module.exports = {
  mockRequest,
  mockResponse,
  mockConfig,
  mockAdapterConfig,
  mockLogger,
  mockDao,
};
