const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/logger', () => require('./../../../utils/jestMocks').mockLogger());
jest.mock('./../../../../src/infrastructure/access', () => {
  return {
    listRolesOfService: jest.fn(),
  };
});


jest.mock('./../../../../src/app/users/utils');

const { getUserDetails, getSingleServiceForUser } = require('./../../../../src/app/users/utils');
const { listRolesOfService } = require('./../../../../src/infrastructure/access');

describe('when displaying the confirm edit service view', () => {

  let req;
  let res;

  let getConfirmEditService;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
      sid: 'service1',
    };
    req.session = {
      service: {
        roles : [
          'role1',
          'role2'
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

    getUserDetails.mockReset();
    getUserDetails.mockReturnValue({
      id: 'user1',
    });


    getSingleServiceForUser.mockReset();
    getSingleServiceForUser.mockReturnValue({
      id: 'service1',
      dateActivated: '10/10/2018',
      name: 'service name',
      status: 'active',
    });

    listRolesOfService.mockReset();
    listRolesOfService.mockReturnValue([{
      code: 'role_code',
      id: 'role_id',
      name: 'role_name',
      status: {
        id: 'status_id'
      },
    }]);

    getConfirmEditService = require('./../../../../src/app/users/confirmEditService').get;
  });

  it('then it should get the users details', async () => {
    await getConfirmEditService(req, res);

    expect(getUserDetails.mock.calls).toHaveLength(1);
    expect(getUserDetails.mock.calls[0][0]).toBe(req);
    expect(res.render.mock.calls[0][1].user).toMatchObject({
      id: 'user1',
    });
  });

  it('then it should get the selected user service', async () => {
    await getConfirmEditService(req, res);

    expect(getSingleServiceForUser.mock.calls).toHaveLength(1);
    expect(getSingleServiceForUser.mock.calls[0][0]).toBe('user1');
    expect(getSingleServiceForUser.mock.calls[0][1]).toBe('org1');
    expect(getSingleServiceForUser.mock.calls[0][2]).toBe('service1');
    expect(getSingleServiceForUser.mock.calls[0][3]).toBe('correlationId');
  });

  it('then it should get the selected roles', async () => {
    await getConfirmEditService(req, res);

    expect(listRolesOfService.mock.calls).toHaveLength(1);
    expect(listRolesOfService.mock.calls[0][0]).toBe('service1');
    expect(listRolesOfService.mock.calls[0][1]).toBe('correlationId');
  });

  it('then it should return the confirm edit services view', async () => {
    await getConfirmEditService(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/confirmEditService');
  });

  it('then it should include csrf token', async () => {
    await getConfirmEditService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });

  it('then it should include the organisation details', async () => {
    await getConfirmEditService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      organisationDetails: req.organisationDetails,
    });
  });

  it('then it should include the service details', async () => {
    await getConfirmEditService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      service: getSingleServiceForUser(),
    });
  });

});
