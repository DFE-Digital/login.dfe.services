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
    },
  };
});

const rp = require('login.dfe.request-promise-retry');

describe('when getting all users in an organisation', () => {
  let req;
  let res;
  let adapter;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();

    rp.mockReset();
    rp.mockReturnValue(
      [
        {
          user_id: '05A8B9E2-3550-4655-875D-01B017EC2555',
          organisation_id: 'FA460F7C-8AB9-4CEE-AAFF-82D6D341D702',
          role: {
            id: 0,
            name: 'End user',
          },
          status: 0,
          numberOfPages: 1,
        }
      ]
    );

    adapter = require('./../../../../src/infrastructure/organisations/api');
  });



   it('then it should query organisations api', async () => {
     await adapter.getAllUsersForOrganisation('user1');

     expect(rp.mock.calls).toHaveLength(1);
     expect(rp.mock.calls[0][0].uri).toBe('http://orgs.api.test/organisations/user1/users');
   });

   it('then it should include the bearer token for authorization', async () => {
     await adapter.getAllUsersForOrganisation('user1');

     expect(rp.mock.calls[0][0].headers).not.toBeNull();
     expect(rp.mock.calls[0][0].headers.authorization).toBe('bearer token');
   });

   it('then it should map api result to array of user-organisations', async () => {
     const actual = await adapter.getAllUsersForOrganisation('user1');

     expect(actual).not.toBeNull();
     expect(actual).toBeInstanceOf(Array);
     expect(actual).toHaveLength(1);
     expect(actual[0].user_id).toBe('05A8B9E2-3550-4655-875D-01B017EC2555');
     expect(actual[0].role.id).toBe(0);
     expect(actual[0].role.name).toBe('End user');
     expect(actual[0].status).toBe(0);
     expect(actual[0].numberOfPages).toBe(1);
   });
});

