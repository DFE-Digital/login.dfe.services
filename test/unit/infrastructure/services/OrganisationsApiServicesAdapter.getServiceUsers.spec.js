const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
const Service = require('./../../../../src/infrastructure/services/Service');
const ServiceUser = require('./../../../../src/infrastructure/services/ServiceUser');

jest.mock('request-promise');
jest.mock('login.dfe.jwt-strategies', () => () => ({
  getBearerToken: () => 'token',
}));
jest.mock('./../../../../src/infrastructure/config', () => {
  return {
    organisations: {
      service: {
        url: 'http://orgs.api.test',
      },
    },
    hostingEnvironment: {
      agentKeepAlive: {}
    },
  };
});


describe('when getting service users', () => {
  let req;
  let res;
  let rp = jest.fn();
  let adapter;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();

    rp.mockReset();
    rp.mockReturnValue([
      {
        id: 'user1',
        name: 'User One',
        role: {
          id: 0,
          name: 'user',
        },
      },
    ]);
    const requestPromise = require('request-promise');
    requestPromise.defaults.mockReturnValue(rp);

    adapter = require('./../../../../src/infrastructure/services/OrganisationsApiServicesAdapter');

  });

  it('then it should query organisations api', async () => {
    await adapter.getServiceUsers('org1', 'service1');

    expect(rp.mock.calls).toHaveLength(1);
    expect(rp.mock.calls[0][0].uri).toBe('http://orgs.api.test/organisations/org1/services/service1/users');
  });

  it('then it should include the bearer token for authorization', async () => {
    await adapter.getServiceUsers('service1');

    expect(rp.mock.calls[0][0].headers).not.toBeNull();
    expect(rp.mock.calls[0][0].headers.authorization).toBe('Bearer token');
  });

  it('then it should map api result to an array of ServiceUser', async () => {
    const actual = await adapter.getServiceUsers('service1');

    expect(actual).not.toBeNull();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(1);
    expect(actual[0].id).toBe('user1');
    expect(actual[0].name).toBe('User One');
    expect(actual[0].role.id).toBe(0);
    expect(actual[0].role.name).toBe('user');
  });
});
