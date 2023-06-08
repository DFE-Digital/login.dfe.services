jest.mock('login.dfe.policy-engine');
jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/logger', () => require('./../../../utils/jestMocks').mockLogger());
jest.mock('./../../../../src/app/users/utils');
jest.mock('./../../../../src/infrastructure/organisations');
jest.mock('login.dfe.dao', () => {
  return {
    services: {
      list: async (pageNumber, pageSize) => {
        return {
          count: 10,
          rows: [
            {
              id: 'service1',
              isExternalService: true,
              isMigrated: true,
              name: 'Service One',
            },
            {
              id: 'service2',
              isExternalService: true,
              isMigrated: true,
              name: 'Service two',
            },
          ],
        };
      },
    },
    directories: {
      fetchUserBanners: async (_userId, _bannerId) => {
        return null;
      },
      createUserBanners: async (_userId, _bannerId) => {
        return Promise.resolve(true);
      },
    },
  };
});

const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
const { getAllServicesForUserInOrg } = require('./../../../../src/app/users/utils');
const {
  getOrganisationAndServiceForUserV2,
  getNonPagedRequestsTypesForApprover,
} = require('../../../../src/infrastructure/organisations');
jest.mock('../../../../src/infrastructure/organisations', () => {
  return {
    getNonPagedRequestsTypesForApprover: jest.fn(),
    getOrganisationAndServiceForUserV2: jest.fn(),
  };
});
const PolicyEngine = require('login.dfe.policy-engine');
const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
};

const requestservices = {
  requests: [
    {
      id: 'request1',
      user_id: 'user1',
      service_id: 'service1',
      organisation_id: 'organisationId',
      role_ids: 'role1, role2',
      status: '0',
      actioned_by: null,
      actioned_reason: null,
      reason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      request_type: 'service',
    },
  ],
};

describe('when displaying the request a service page', () => {
  let req;
  let res;
  let post;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'organisationId',
      sid: 'service1',
    };
    req.body = { services: 'service1' };
    req.session = {
      organisationDetails: [
        {
          approvers: [{ user_id: 'user2' }],
          organisation: {
            id: 'organisationId',
            name: 'organisationName',
            approvers: [{ user_id: 'user2' }],
          },
          role: {
            id: 0,
            name: 'category name',
          },
        },
      ],
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
      services: [
        {
          serviceId: 'service1',
          roles: [],
        },
      ],
      organisations: [
        {
          approvers: [{ user_id: 'user2' }],
          organisation: {
            id: 'organisationId',
            name: 'organisationName',
            approvers: [{ user_id: 'user2' }],
          },
          role: {
            id: 0,
            name: 'category name',
          },
        },
      ],
    };
    req.organisationDetails = [
      {
        approvers: [{ user_id: 'user2' }],
        organisation: {
          id: 'organisationId',
          name: 'organisationName',
          approvers: [{ user_id: 'user2' }],
        },
        role: {
          id: 0,
          name: 'category name',
        },
      },
    ];
    req.userOrganisations = [
      {
        approvers: [{ user_id: 'user2' }],
        organisation: {
          id: 'organisationId',
          name: 'organisationName',
          approvers: [{ user_id: 'user2' }],
        },
        role: {
          id: 0,
          name: 'category name',
        },
      },
    ];
    res = mockResponse();

    getOrganisationAndServiceForUserV2.mockReset();
    getOrganisationAndServiceForUserV2.mockReturnValue([
      {
        organisation: {
          id: 'organisationId',
        },
      },
    ]);

    getNonPagedRequestsTypesForApprover.mockReset();
    getNonPagedRequestsTypesForApprover.mockReturnValue(requestservices);

    getAllServicesForUserInOrg.mockReset();
    getAllServicesForUserInOrg.mockReturnValue([
      {
        id: 'service1',
        dateActivated: '10/10/2018',
        name: 'service name',
        status: 'active',
        isExternalService: true,
      },
    ]);

    policyEngine.getPolicyApplicationResultsForUser.mockReset().mockReturnValue({
      policiesAppliedForUser: [],
      rolesAvailableToUser: [],
      serviceAvailableToUser: true,
    });
    PolicyEngine.mockReset().mockImplementation(() => policyEngine);

    post = require('./../../../../src/app/requestService/requestService').post;
  });

  it('then it should display the select service page', async () => {
    await post(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('requestService/views/requestService');
  });

  it('then it should include csrf token', async () => {
    await post(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });
});
