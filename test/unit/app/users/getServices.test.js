const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/app/users/utils');
jest.mock('./../../../../src/infrastructure/applications', () => {
  return {
    getAllServices: jest.fn(),
  };
});

const { getUserDetails, getAllServicesForUserInOrg } = require('./../../../../src/app/users/utils');
const { getAllServices } = require('./../../../../src/infrastructure/applications');
const getServices = require('./../../../../src/app/users/getServices');

describe('when displaying the users services', () => {
  let req;
  let res;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
    };
    req.user = {
      sub: 'user1',
      email: 'user.one@unit.test',
      organisations: [
        {
          organisation: {
            id: 'organisationId',
            name: 'organisationName',
          },
          role: {
            id: 0,
            name: 'category name',
          },
        },
      ],
    };
    req.userOrganisations = [
      {
        organisation: {
          id: 'organisationId',
          name: 'organisationName',
        },
        role: {
          id: 0,
          name: 'category name',
        },
      },
    ];
    res = mockResponse();

    getUserDetails.mockReset();
    getUserDetails.mockReturnValue({
      id: 'user1',
    });

    getAllServicesForUserInOrg.mockReset();
    getAllServicesForUserInOrg.mockReturnValue([
      {
        id: 'service1',
        dateActivated: '10/10/2018',
        name: 'service name',
        status: 'active',
      },
    ]);

    getAllServices.mockReset();
    getAllServices.mockReturnValue({
      services: [
        {
          id: 'service1',
          dateActivated: '10/10/2018',
          name: 'service name',
          status: 'active',
          isExternalService: true,
          relyingParty: {
            params: {},
          },
        },
      ],
    });
  });

  it('then it should get the users details', async () => {
    await getServices(req, res);

    expect(getUserDetails.mock.calls).toHaveLength(1);
    expect(getUserDetails.mock.calls[0][0]).toBe(req);
    expect(res.render.mock.calls[0][1].user).toMatchObject({
      id: 'user1',
    });
  });

  it('then it should get the services for a user', async () => {
    await getServices(req, res);

    expect(getAllServicesForUserInOrg.mock.calls).toHaveLength(1);
    expect(getAllServicesForUserInOrg.mock.calls[0][0]).toBe('user1');
    expect(getAllServicesForUserInOrg.mock.calls[0][1]).toBe('org1');
    expect(getAllServicesForUserInOrg.mock.calls[0][2]).toBe('correlationId');
  });

  it('then it should return the services view', async () => {
    await getServices(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/services');
  });

  it('then it should include csrf token', async () => {
    await getServices(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });
});
