jest.mock('login.dfe.policy-engine');
jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/applications', () => {
  return {
    getApplication: jest.fn(),
  };
});

const { mockRequest, mockResponse, mockConfig } = require('./../../../utils/jestMocks');
const PolicyEngine = require('login.dfe.policy-engine');
const { getApplication } = require('./../../../../src/infrastructure/applications');
const { actions } = require('../../../../src/app/constans/actions');

const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
};

describe('when displaying the associate roles view', () => {
  let req;
  let res;
  let config;
  let getAssociateRoles;

  beforeEach(() => {
    config = mockConfig();
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
      sid: 'service1',
    };
    req.session = {
      user: {
        uid:'07ba1cce-0f24-400f-b9bb-50ee72e93d6f',
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

    getAssociateRoles = require('./../../../../src/app/users/associateRoles').get;
  });

  it('then it should return the associate roles view', async () => {
    await getAssociateRoles(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/associateRoles');
  });

  it('then it should include csrf token', async () => {
    await getAssociateRoles(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });

  it('then it should include the organisation details', async () => {
    await getAssociateRoles(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      organisationDetails: req.organisationDetails,
    });
  });

  it('then it should include the number of selected services', async () => {
    await getAssociateRoles(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      totalNumberOfServices: req.session.user.services.length,
    });
  });

  it('then it should include the current service', async () => {
    await getAssociateRoles(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      currentService: 1,
    });
  });

  it('then it should get the service details', async () => {
    await getAssociateRoles(req, res);
    expect(getApplication.mock.calls).toHaveLength(1);
    expect(getApplication.mock.calls[0][0]).toBe('service1');
  });

  it ('then it gets the correct cancel redirect link when adding new service to an end user', async () => {
  await getAssociateRoles(req,res);
  expect(res.render.mock.calls[0][1]).toMatchObject({
    cancelLink: '/approvals/users/07ba1cce-0f24-400f-b9bb-50ee72e93d6f',
  })
})

it ('then it gets the correct cancel redirect link reviewing a service request as an approver and amending the role', async () => {

  req.query.action = actions.REVIEW_SERVICE_REQ_ROLE;
  req.session.reviewServiceRequest = {
    serviceReqId: 'service-request-id',
    serviceId: 'service1', 
    selectedRoleIds: 'roleId-1'
  }

  await getAssociateRoles(req,res);
  expect(res.render.mock.calls[0][1]).toMatchObject({
    cancelLink: `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/access-requests/service-requests/service-request-id/services/service1/roles/roleId-1`
  })
})

it ('then it gets the correct cancel redirect link reviewing a service request as an approver and amending the service', async () => {

  req.query.action = actions.REVIEW_SERVICE_REQ_SERVICE;
  req.session.reviewServiceRequest = {
    serviceReqId: 'service-request-id',
    serviceId: 'service1', 
    selectedRoleIds: 'roleId-1'
  }

  await getAssociateRoles(req,res);
  expect(res.render.mock.calls[0][1]).toMatchObject({
    cancelLink: `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/access-requests/service-requests/service-request-id/services/service1/roles/roleId-1`
  })
})
});
