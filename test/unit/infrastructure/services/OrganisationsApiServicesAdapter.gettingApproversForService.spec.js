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


describe('when getting approvers of a service', () => {
  let req;
  let res;
  let rp = jest.fn();
  let adapter;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();

    rp.mockReset();
    rp.mockReturnValue(
      [{
        id: '123-afd',
      }, {
        id: '456-cdf',
      }],
    );
    const requestPromise = require('request-promise');
    requestPromise.defaults.mockReturnValue(rp);

    adapter = require('./../../../../src/infrastructure/services/OrganisationsApiServicesAdapter');

  });
  it('then the request is retrieved from the organisations API', async () => {
    await adapter.getApproversForService('org1', 'service1');

    expect(rp.mock.calls).toHaveLength(1);
    expect(rp.mock.calls[0][0].uri).toBe('http://orgs.api.test/organisations/org1/services/service1/approvers');
  });
  it('then the bearer token for authorization is included', async () => {
    await adapter.getApproversForService('org1', 'service1');

    expect(rp.mock.calls[0][0].headers).not.toBeNull();
    expect(rp.mock.calls[0][0].headers.authorization).toBe('Bearer token');
  });
  it('then the result is mapped to a user service request', async () => {
    const actual = await adapter.getApproversForService('org1', 'service1');

    expect(actual).not.toBeNull();
    expect(actual[0].id).toBe('123-afd');
    expect(actual[1].id).toBe('456-cdf');
  });
});
