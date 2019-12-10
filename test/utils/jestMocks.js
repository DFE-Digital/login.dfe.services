'use strict';

const mockConfig = () => {
  return {
    hostingEnvironment: {
      agentKeepAlive: {},
      env: 'test-run',
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
    notifications:{
      connectionString: 'test',
    },
    organisationRequests: {
      requestLimit: 3
    }
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
  return Object.assign( {
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
