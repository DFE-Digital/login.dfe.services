const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/logger', () => require('./../../../utils/jestMocks').mockLogger());
jest.mock('./../../../../src/infrastructure/access', () => {
  return {
    listRolesOfService: jest.fn(),
    addInvitationService: jest.fn(),
    addUserService: jest.fn(),
  };
});
jest.mock('./../../../../src/infrastructure/applications', () => {
  return {
    getAllServices: jest.fn(),
  };
});

const { listRolesOfService } = require('./../../../../src/infrastructure/access');
const { getAllServices } = require('./../../../../src/infrastructure/applications');

describe('when displaying the confirm new user view', () => {

  let req;
  let res;

  let getConfirmNewUser;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
      sid: 'service1',
    };
    req.session = {
      user: {
        email: 'test@test.com',
        firstName: 'test',
        lastName: 'name',
        services: [
          {
            serviceId: 'service1',
            roles: [],
          }
        ],
      },
    };

    req.user = {
      sub: 'user1',
      email: 'user.one@unit.test',
      organisations: [{
        organisation: {
          id: 'organisationId',
          name: 'organisationName',
        },
        role: {
          id: 0,
          name: 'category name'
        }
      }],
    };
    req.userOrganisations = [{
      organisation: {
        id: 'organisationId',
        name: 'organisationName',
      },
      role: {
        id: 0,
        name: 'category name'
      }
    }];
    res = mockResponse();

    listRolesOfService.mockReset();
    listRolesOfService.mockReturnValue([{
      code: 'role_code',
      id: 'role_id',
      name: 'role_name',
      status: {
        id: 'status_id'
      },
    }]);
    getAllServices.mockReset();
    getAllServices.mockReturnValue({
      services: [{
        id: 'service1',
        dateActivated: '10/10/2018',
        name: 'service name',
        status: 'active',
        isExternalService: true,
      }]
    });


    getConfirmNewUser = require('./../../../../src/app/users/confirmNewUser').get;
  });

  it('then it should get all services', async () => {
    await getConfirmNewUser(req, res);

    expect(getAllServices.mock.calls).toHaveLength(1);
    expect(getAllServices.mock.calls[0][0]).toBe('correlationId');
  });

  it('then it should list all roles of service', async () => {
    await getConfirmNewUser(req, res);

    expect(listRolesOfService.mock.calls).toHaveLength(1);
    expect(listRolesOfService.mock.calls[0][0]).toBe('service1');
    expect(listRolesOfService.mock.calls[0][1]).toBe('correlationId');
  });

  it('then it should return the confirm new user view', async () => {
    await getConfirmNewUser(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/confirmNewUser');
  });

  it('then it should include csrf token', async () => {
    await getConfirmNewUser(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });

  it('then it should include the users details', async () => {
    await getConfirmNewUser(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      user: {
        firstName: 'test',
        lastName: 'name',
        email: 'test@test.com',
        isInvite: false,
        uid: ''
      }
    });
  });

  it('then it should include the service details', async () => {
    await getConfirmNewUser(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      services: [{
        id: 'service1',
        name: 'service name',
        roles: [],
      }]
    });
  });

});
