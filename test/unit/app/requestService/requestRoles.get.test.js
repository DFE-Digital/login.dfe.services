jest.mock('login.dfe.policy-engine');
jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/applications', () => {
  return {
    getApplication: jest.fn(),
  };
});

const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
const PolicyEngine = require('login.dfe.policy-engine');
const { getApplication } = require('./../../../../src/infrastructure/applications');

const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
};

describe('when displaying the sub-services view', () => {
  let req;
  let res;

  let getRequestRoles;

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
          },
        ],
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
    res = mockResponse();

    policyEngine.getPolicyApplicationResultsForUser.mockReset().mockReturnValue({
      rolesAvailableToUser: [],
    });
    PolicyEngine.mockReset().mockImplementation(() => policyEngine);

    getRequestRoles = require('./../../../../src/app/requestService/requestRoles').get;
  });

  it('then it should return the sub-service view', async () => {
    await getRequestRoles(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('requestService/views/requestRoles');
  });

  it('then it should include csrf token', async () => {
    await getRequestRoles(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });

  it('then it should include the current service', async () => {
    await getRequestRoles(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      currentService: 1,
    });
  });

  it('then it should get the service details', async () => {
    await getRequestRoles(req, res);
    expect(getApplication.mock.calls).toHaveLength(1);
    expect(getApplication.mock.calls[0][0]).toBe('service1');
  });
});
