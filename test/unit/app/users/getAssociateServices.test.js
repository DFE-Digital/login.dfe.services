const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());

jest.mock('./../../../../src/infrastructure/applications', () => {
  return {
    getAllServices: jest.fn(),
  };
});
jest.mock('./../../../../src/app/users/utils');

const { getAllServices } = require('./../../../../src/infrastructure/applications');
const { getAllServicesForUserInOrg } = require('./../../../../src/app/users/utils');

describe('when displaying the associate service view', () => {

  let req;
  let res;

  let getAssociateServices;

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
    getAllServicesForUserInOrg.mockReset();
    getAllServicesForUserInOrg.mockReturnValue([{
      id: 'service2',
      dateActivated: '10/10/2018',
      name: 'service name',
      status: 'active',
      isExternalService: true,
    }]);

    getAssociateServices = require('./../../../../src/app/users/associateServices').get;
  });

  it('then it should return the associate services view', async () => {
    await getAssociateServices(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/associateServices');
  });

  it('then it should include csrf token', async () => {
    await getAssociateServices(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });

  it('then it should include the organisation details', async () => {
    await getAssociateServices(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      organisationDetails: req.organisationDetails,
    });
  });

  it('then it should include the services', async () => {
    await getAssociateServices(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      services: [{
        id: 'service1',
        dateActivated: '10/10/2018',
        name: 'service name',
        status: 'active',
      }],
    });
  });

});
