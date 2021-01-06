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

jest.mock('login.dfe.dao', () => {
  return {
    organisation: {
      getOrganisationsForUserIncludingServices: async (ids) => {
        return [
          {
            organisation: {
              id: '1148F925-D0FB-4A3D-A0C8-D0EC96F1AE69',
              name: '0-2-5 NURSERY test',
              urn: '517665',
              status: {
                id: 1,
                name: 'Open',
              },
              legacyUserId: '147',
              legacyUserName: 'h73ndef',
              category: {
                id: '004',
                name: 'Early Year Setting',
              },
              companyRegistrationNumber: null,
            },
            role: {
              id: 10000,
              name: 'Approver',
            },
            approvers: [
              {
                user_id: '11D62132-6570-4E63-9DCB-137CC35E7543',
                organisation_id: '1148F925-D0FB-4A3D-A0C8-D0EC96F1AE69',
                role_id: 10000,
                status: 0,
                reason: null,
                numeric_identifier: null,
                text_identifier: null,
                createdAt: '2018-10-11T15:19:59.409Z',
                updatedAt: '2018-10-11T15:19:59.409Z',
              },
              {
                user_id: 'E15CCDE2-FFDC-4593-8475-3759C0F86FFD',
                organisation_id: '1148F925-D0FB-4A3D-A0C8-D0EC96F1AE69',
                role_id: 10000,
                status: 0,
                reason: null,
                numeric_identifier: '147',
                text_identifier: 'h73ndef',
                createdAt: '2019-12-05T10:48:16.512Z',
                updatedAt: '2019-12-05T10:48:16.512Z',
              },
              {
                user_id: 'C844FCBD-ECCF-485D-B6E1-72A1E7D924E1',
                organisation_id: '1148F925-D0FB-4A3D-A0C8-D0EC96F1AE69',
                role_id: 10000,
                status: 1,
                reason: '05b14b8c-0716-4eeb-b913-894196f13d78',
                numeric_identifier: '131',
                text_identifier: 'hkhedd4',
                createdAt: '2019-11-28T11:08:47.900Z',
                updatedAt: '2019-12-02T09:03:31.942Z',
              },
              {
                user_id: '20A11600-DEDD-4929-AE21-858868C85D26',
                organisation_id: '1148F925-D0FB-4A3D-A0C8-D0EC96F1AE69',
                role_id: 10000,
                status: 1,
                reason: null,
                numeric_identifier: '29',
                text_identifier: 'r6ffe4f',
                createdAt: '2018-10-11T15:35:57.314Z',
                updatedAt: '2019-04-25T08:32:32.008Z',
              },
              {
                user_id: '2F0E3A37-1BD8-450A-9001-860079E2778F',
                organisation_id: '1148F925-D0FB-4A3D-A0C8-D0EC96F1AE69',
                role_id: 10000,
                status: 1,
                reason: 'db2afee7-2ea2-4a09-822a-89b2ea893ac6',
                numeric_identifier: '136',
                text_identifier: 'hkkf4ff',
                createdAt: '2019-12-02T11:56:01.832Z',
                updatedAt: '2019-12-02T11:56:01.832Z',
              },
              {
                user_id: '4BFE4D49-7DE8-489C-9321-BDDA0D2C4D1C',
                organisation_id: '1148F925-D0FB-4A3D-A0C8-D0EC96F1AE69',
                role_id: 10000,
                status: 0,
                reason: '2a44817f-eb15-4fdb-a363-876427f7b4a8',
                numeric_identifier: '262',
                text_identifier: 'r2r4fe4',
                createdAt: '2020-02-07T15:39:08.697Z',
                updatedAt: '2020-02-13T15:45:09.002Z',
              },
              {
                user_id: 'C7AE5F34-33EE-4148-A160-E09F029AC5BB',
                organisation_id: '1148F925-D0FB-4A3D-A0C8-D0EC96F1AE69',
                role_id: 10000,
                status: 0,
                reason: null,
                numeric_identifier: '148',
                text_identifier: 'h774nde',
                createdAt: '2019-12-10T09:57:33.025Z',
                updatedAt: '2019-12-10T09:57:33.025Z',
              },
              {
                user_id: '26F2F3C3-B367-4027-995B-F5EFAF21985A',
                organisation_id: '1148F925-D0FB-4A3D-A0C8-D0EC96F1AE69',
                role_id: 10000,
                status: 1,
                reason: '',
                numeric_identifier: null,
                text_identifier: null,
                createdAt: '2018-11-28T13:49:19.983Z',
                updatedAt: '2018-11-28T13:49:19.983Z',
              },
            ],
            services: [
              {
                id: 'C09AB9EF-F0CD-4C3A-8284-6BBED2F3FBC3',
                externalIdentifiers: [],
                requestDate: '2020-02-18T11:26:17.707Z',
                status: 1,
              },
            ],
            numericIdentifier: '147',
            textIdentifier: 'h73ndef',
          },
        ];
      },
      deleteUserOrganisation: async (orgId, userId) => {
        return true;
      },
    },
  };
});

const rp = require('login.dfe.request-promise-retry');

describe('when getting all users in an organisation', () => {
  let req;
  let res;
  let apiCall;

  beforeEach(() => {
    req = mockRequest();
    res = mockResponse();

    rp.mockReset();
    rp.mockReturnValue([
      {
        user_id: '05A8B9E2-3550-4655-875D-01B017EC2555',
        organisation_id: 'FA460F7C-8AB9-4CEE-AAFF-82D6D341D702',
        role: {
          id: 0,
          name: 'End user',
        },
        status: 0,
        numberOfPages: 1,
      },
    ]);

    apiCall = require('./../../../../src/infrastructure/organisations/api');
  });

  it('then it should query organisations api', async () => {
    await apiCall.getAllUsersForOrganisation('user1');

    expect(rp.mock.calls).toHaveLength(1);
    expect(rp.mock.calls[0][0].uri).toBe('http://orgs.api.test/organisations/user1/users');
  });

  it('then it should include the bearer token for authorization', async () => {
    await apiCall.getAllUsersForOrganisation('user1');

    expect(rp.mock.calls[0][0].headers).not.toBeNull();
    expect(rp.mock.calls[0][0].headers.authorization).toBe('bearer token');
  });

  it('then it should map api result to array of user-organisations', async () => {
    const actual = await apiCall.getAllUsersForOrganisation('user1');

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
