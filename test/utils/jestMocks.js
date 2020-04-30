'use strict';

const mockConfig = () => {
  return {
    hostingEnvironment: {
      env: 'test-run',
      serviceId:'28388aeb-431b-49bc-9480-8db1b0bdd6e1'
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
      requestLimit: 3
    },
    toggles: {
      useApproverJourney: true,
      useRequestOrganisation: true
    },
    database: {
      host: "s141d01-signin-shd-sql.database.windows.net",
      username: "3Z4R66fCgTfaXbkukgpP",
      password: "KGUTHYfWpUC2!amns7DF",
      dialect: "mssql",
      name: "s141d01-signin-organisations-db",
      encrypt: true,
      schema: "dbo",
      pool: {
        max: 100,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
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
  return Object.assign({
    params: {
      uuid: '123-abc',
    },
    id: 'correlationId',
    session: {},
    body: {},
    query: {},
    csrfToken: jest.fn().mockReturnValue('token'),
    isAuthenticated: jest.fn().mockReturnValue(true),
  }, customRequest);
};
const mockResponse = () => {
  return {
    render: jest.fn(),
    redirect: jest.fn(),
    flash: jest.fn(),
    mockResetAll: function () {
      this.render.mockReset().mockReturnValue(this);
      this.redirect.mockReset().mockReturnValue(this);
      this.flash.mockReset().mockReturnValue(this);
    }
  };
};


module.exports = {
  mockRequest,
  mockResponse,
  mockConfig,
  mockLogger,
};
