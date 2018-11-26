const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());


describe('when selecting the roles for a service', () => {

  let req;
  let res;

  let postAssociateRoles;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
      sid: 'service1',
    };
    req.body = {
      roles : [
        'role1',
      ]

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
        ]
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

    postAssociateRoles = require('./../../../../src/app/users/associateRoles').post;
  });

});
