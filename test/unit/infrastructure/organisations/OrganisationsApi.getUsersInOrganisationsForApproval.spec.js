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
    hostingEnvironment: {
      agentKeepAlive: {}
    },
  };
});



describe('when getting users in organisations for approval', () => {
  let req;
  let res;
  let adapter;
  let rp = jest.fn();

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();

    rp.mockReset();
    rp.mockReturnValue(
      [
        {
          user_id: '05A8B9E2-3550-4655-875D-01B017EC2555',
          organisation_id: 'FA460F7C-8AB9-4CEE-AAFF-82D6D341D702',
          role_id: 0,
          status: 0,
          createdAt: '2018-04-26T14:22:16.936Z',
          updatedAt: '2018-04-26T14:22:16.936Z',
          Organisation: {
            id: 'FA460F7C-8AB9-4CEE-AAFF-82D6D341D702',
            name: 'Local Authority',
            Category: '002',
            Type: null,
            URN: null,
            UID: null,
            UKPRN: null,
            EstablishmentNumber: null,
            Status: 1,
            ClosedOn: null,
            Address: null
          }
        }
      ]
    );
    const requestPromise = require('login.dfe.request-promise-retry');
    requestPromise.defaults.mockReturnValue(rp);

    adapter = require('./../../../../src/infrastructure/organisations/api');
  });

  it('then it should query organisations api', async () => {
    await adapter.getOrganisationUsersForApproval('user1');

    expect(rp.mock.calls).toHaveLength(1);
    expect(rp.mock.calls[0][0].uri).toBe('http://orgs.api.test/organisations/users-for-approval/user1');
  });

  it('then it should include the bearer token for authorization', async () => {
    await adapter.getOrganisationUsersForApproval('user1');

    expect(rp.mock.calls[0][0].headers).not.toBeNull();
    expect(rp.mock.calls[0][0].headers.authorization).toBe('bearer token');
  });

  it('then it should map api result to array of user-organisations', async () => {
    const actual = await adapter.getOrganisationUsersForApproval('user1');

    expect(actual).not.toBeNull();
    expect(actual).toBeInstanceOf(Array);
    expect(actual).toHaveLength(1);
    expect(actual[0].user_id).toBe('05A8B9E2-3550-4655-875D-01B017EC2555');
    expect(actual[0].createdAt).toBe('2018-04-26T14:22:16.936Z');
    expect(actual[0].Organisation.name).toBe('Local Authority');
  });
});

