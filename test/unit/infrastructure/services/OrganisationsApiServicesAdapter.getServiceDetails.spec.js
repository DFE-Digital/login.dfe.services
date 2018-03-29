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

describe('when getting service details', () => {
  let req;
  let res;
  let rp = jest.fn();
  let adapter;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();

    rp.mockReset();
    rp.mockReturnValue(
      {
        id: 'service1',
        name: 'Service One',
        description: 'Some service',
      },
    );
    const requestPromise = require('request-promise');
    requestPromise.defaults.mockReturnValue(rp);

    adapter = require('./../../../../src/infrastructure/services/OrganisationsApiServicesAdapter');
  });

  it('then it should query organisations api', async () => {
    await adapter.getServiceDetails('org1', 'service1');

    expect(rp.mock.calls).toHaveLength(1);
    expect(rp.mock.calls[0][0].uri).toBe('http://orgs.api.test/organisations/org1/services/service1');
  });

  it('then it should include the bearer token for authorization', async () => {
    await adapter.getServiceDetails('service1');

    expect(rp.mock.calls[0][0].headers).not.toBeNull();
    expect(rp.mock.calls[0][0].headers.authorization).toBe('Bearer token');
  });

  it('then it should map api result to a Service', async () => {
    const actual = await adapter.getServiceDetails('service1');

    expect(actual).not.toBeNull();
    expect(actual).toBeInstanceOf(Service);
    expect(actual.id).toBe('service1');
    expect(actual.name).toBe('Service One');
    expect(actual.description).toBe('Some service');
  });
});
