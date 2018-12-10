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

describe('when adding services to a user', () => {

  let req;
  let res;

  let postAssociateServices;

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
        relyingParty: {
          params: {

          }
        }
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

    postAssociateServices = require('./../../../../src/app/users/associateServices').post;
  });

  it('then it should render view if a service is not selected', async () => {
    req.body.selectedServices = undefined;

    await postAssociateServices(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/associateServices');
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: 'token',
      name: 'test name',
      backLink: 'services',
      currentPage: 'users',
      organisationDetails:  undefined,
      selectedServices:  undefined,
      services: [
        {
          id: 'service1',
          dateActivated: '10/10/2018',
          name: 'service name',
          status: 'active',
          isExternalService: true,
          relyingParty: {
            params: {

            }
          }
        }
      ],
      user: {
        email: 'test@test.com',
        firstName: 'test',
        lastName: 'name',
      },
      validationMessages: {
        services: 'At least one service must be selected',
      },
    });
  });

  it('then it should redirect to associate roles', async () => {
    req.body.service = [
      'service1',
    ];
    await postAssociateServices(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`associate-services/${req.session.user.services[0].serviceId}`);
  });

});
