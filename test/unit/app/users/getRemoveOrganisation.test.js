const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/logger', () => require('./../../../utils/jestMocks').mockLogger());
jest.mock('./../../../../src/app/users/utils');

const { getUserDetails, getAllServicesForUserInOrg } = require('./../../../../src/app/users/utils');

describe('when displaying the remove organisation', () => {

  let req;
  let res;

  let getRemoveOrganisation;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
    };
    req.session = {
      user: {
        email: 'test@test.com',
        firstName: 'test',
        lastName: 'name',
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

    getAllServicesForUserInOrg.mockReset();
    getAllServicesForUserInOrg.mockReturnValue({
      id: 'service1',
      dateActivated: '10/10/2018',
      name: 'service name',
      status: 'active',
    });

    getRemoveOrganisation = require('./../../../../src/app/users/removeOrganisationAccess').get;
  });

  it('then it should get the services for a user', async () => {
    await getRemoveOrganisation(req, res);

    expect(getAllServicesForUserInOrg.mock.calls).toHaveLength(1);
    expect(getAllServicesForUserInOrg.mock.calls[0][0]).toBe('user1');
    expect(getAllServicesForUserInOrg.mock.calls[0][1]).toBe('org1');
    expect(getAllServicesForUserInOrg.mock.calls[0][2]).toBe('correlationId');
  });


  it('then it should return the services view', async () => {
    await getRemoveOrganisation(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/removeOrganisation');
  });

  it('then it should include csrf token', async () => {
    await getRemoveOrganisation(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });

});
