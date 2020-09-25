const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('login.dfe.request-promise-retry');
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
    hostingEnvironment: {},
  };
});

const rp = require('login.dfe.request-promise-retry');

describe('when putting a user in organisations for approval', () => {
  let req;
  let res;
  let adapter;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();

    rp.mockReset();
    rp.mockReturnValue({});

    adapter = require('./../../../../src/infrastructure/organisations/api');
  });

  it('then it should PUT details to the organisations api', async () => {
    await adapter.putUserInOrganisation('user1', 'org1', 'status1', 'role1', 'rejection-reason', 'correlationId');

    expect(rp.mock.calls).toHaveLength(1);
    expect(rp.mock.calls[0][0].uri).toBe('http://orgs.api.test/organisations/org1/users/user1');
    expect(rp.mock.calls[0][0].method).toBe('PUT');
    expect(rp.mock.calls[0][0].body.reason).toBe('rejection-reason');
    expect(rp.mock.calls[0][0].body.status).toBe('status1');
    expect(rp.mock.calls[0][0].body.roleId).toBe('role1');
    expect(rp.mock.calls[0][0].headers['x-correlation-id']).toBe('correlationId');
  });

  it('then it should include the bearer token for authorization', async () => {
    await adapter.putUserInOrganisation('user1');

    expect(rp.mock.calls[0][0].headers).not.toBeNull();
    expect(rp.mock.calls[0][0].headers.authorization).toBe('bearer token');
  });
});
