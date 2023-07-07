jest.mock('./../../../../src/infrastructure/config', () => require('../../../utils/jestMocks').mockConfig());
jest.mock('login.dfe.policy-engine');
jest.mock('./../../../../src/app/users/utils');
jest.mock('./../../../../src/infrastructure/applications', () => {
  return {
    getApplication: jest.fn(),
  };
});
jest.mock('login.dfe.dao', () => require('../../../utils/jestMocks').mockDao());
const { mockRequest, mockResponse } = require('../../../utils/jestMocks');
const PolicyEngine = require('login.dfe.policy-engine');
const { getSingleServiceForUser } = require('../../../../src/app/users/utils');
const { getApplication } = require('../../../../src/infrastructure/applications');
const application = {
  name: 'Service One',
  relyingParty: {
    service_home: 'http://service.one/login',
    redirect_uris: ['http://service.one/login/cb'],
  },
};
const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
};
jest.mock('../../../../src/app/requestService/utils', () => {
  return {
    createServiceRequest: jest.fn(),
    checkForActiveRequests: jest.fn(),
    getLastRequestDate: jest.fn(),
  };
});
describe('when displaying the request edit service view', () => {
  let req;
  let res;

  let getRequestEditRoles;

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
    getApplication.mockReset().mockReturnValue(application);
    res = mockResponse();

    policyEngine.getPolicyApplicationResultsForUser.mockReset().mockReturnValue({
      rolesAvailableToUser: [],
    });
    PolicyEngine.mockReset().mockImplementation(() => policyEngine);

    getSingleServiceForUser.mockReset();
    getSingleServiceForUser.mockReturnValue({
      id: 'service1',
      dateActivated: '10/10/2018',
      name: 'service name',
      status: 'active',
    });

    getRequestEditRoles = require('../../../../src/app/requestService/requestEditRoles').get;
  });

  it('then it should redirect to Services dashboard if no user in the session', async () => {
    req.session.user = null;

    await getRequestEditRoles(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe('/my-services');
  });

  it('then it should get the selected user service', async () => {
    await getRequestEditRoles(req, res);

    expect(getSingleServiceForUser.mock.calls).toHaveLength(1);
    expect(getSingleServiceForUser.mock.calls[0][0]).toBe('user1');
    expect(getSingleServiceForUser.mock.calls[0][1]).toBe('org1');
    expect(getSingleServiceForUser.mock.calls[0][2]).toBe('service1');
    expect(getSingleServiceForUser.mock.calls[0][3]).toBe('correlationId');
  });

  it('then it should render the requestEditRoles view', async () => {
    await getRequestEditRoles(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('requestService/views/requestEditRoles');
  });

  it('then it should include csrf token', async () => {
    await getRequestEditRoles(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });

  it('then it should include the organisation details', async () => {
    await getRequestEditRoles(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      organisationDetails: req.organisationDetails,
    });
  });

  it('then it should include the service details', async () => {
    await getRequestEditRoles(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      service: {
        name: 'service name',
      },
    });
  });
});
