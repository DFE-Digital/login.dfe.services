jest.mock('login.dfe.policy-engine');
jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/applications', () => {
  return {
    getApplication: jest.fn(),
  };
});
jest.mock('./../../../../src/infrastructure/organisations', () => {
  return {
    getOrganisationAndServiceForUserV2: jest.fn(),
  };
});

jest.mock('../../../../src/app/users/utils', () => {
  const originalUtils = jest.requireActual('../../../../src/app/users/utils');
  return {
    ...originalUtils,
    RoleSelectionConstraintCheck: jest.fn(),
  };
});

const { mockRequest, mockResponse, mockConfig } = require('./../../../utils/jestMocks');
const PolicyEngine = require('login.dfe.policy-engine');
const { getApplication } = require('./../../../../src/infrastructure/applications');
const { getOrganisationAndServiceForUserV2 } = require('./../../../../src/infrastructure/organisations');
const { actions } = require('../../../../src/app/constans/actions');
const { RoleSelectionConstraintCheck } = require('../../../../src/app/users/utils');

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
        uid: '07ba1cce-0f24-400f-b9bb-50ee72e93d6f',
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

  it("then it should include the user's first and last name if user present", async () => {
    await getAssociateRoles(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      name: 'test name',
    });
  });

  it('then it include an emty array for selectedRoles when no user services in the session', async () => {

    req.session.user.services = [];
    await getAssociateRoles(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      selectedRoles: [],
    });
  });

  it('then it should return the associateRolesRedesigned view if self manage ', async () => {
    req.user.sub = '07ba1cce-0f24-400f-b9bb-50ee72e93d6f';
    await getAssociateRoles(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/associateRolesRedesigned');
  });

  it('then it should get the users organisations when building the view model if the user is active', async () => {
    await getAssociateRoles(req, res);

    expect(getOrganisationAndServiceForUserV2).toHaveBeenCalledTimes(1);
    expect(getOrganisationAndServiceForUserV2).toHaveBeenCalledWith('user1', 'correlationId');
  });

  it('then it should not get the users organisations when building the view model if the user is in "invite" satus', async () => {
    req.params.uid = 'inv-user1';
    await getAssociateRoles(req, res);

    expect(getOrganisationAndServiceForUserV2).toHaveBeenCalledTimes(0);
  });

  it('then it should get Policy Application result for user if they have access to the specified organisation', async () => {
    const userOrganisations = [
      {
        organisation: {
          id: 'org1',
        },
      },
      {
        organisation: {
          id: 'org2',
        },
      },
    ];
    getOrganisationAndServiceForUserV2.mockReset().mockReturnValue(userOrganisations);

    await getAssociateRoles(req, res);

    expect(policyEngine.getPolicyApplicationResultsForUser).toHaveBeenCalledTimes(1);
    expect(policyEngine.getPolicyApplicationResultsForUser).toHaveBeenCalledWith(
      'user1',
      'org1',
      'service1',
      'correlationId',
    );
  });

  it(`then it should not get Policy Application result for user if they don't have access to the specified organisation`, async () => {
    const userOrganisations = [
      {
        organisation: {
          id: 'org2',
        },
      },
      {
        organisation: {
          id: 'org3',
        },
      },
    ];
    getOrganisationAndServiceForUserV2.mockReset().mockReturnValue(userOrganisations);

    await getAssociateRoles(req, res);

    expect(policyEngine.getPolicyApplicationResultsForUser).toHaveBeenCalledTimes(1);
    expect(policyEngine.getPolicyApplicationResultsForUser).toHaveBeenCalledWith(
      undefined,
      'org1',
      'service1',
      'correlationId',
    );
  });

  it('then it should redirect to the users page if there is no user in the session', async () => {
    req.session.user = undefined;
    await getAssociateRoles(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe('/approvals/users');
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

  it('then it gets the correct "Cancel" redirect link when adding new service to an end user', async () => {
    await getAssociateRoles(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      cancelLink: '/approvals/users/07ba1cce-0f24-400f-b9bb-50ee72e93d6f',
    });
  });

  it('then it gets the correct "Cancel" redirect link reviewing a service request as an approver and amending the role', async () => {
    req.query.action = actions.REVIEW_SERVICE_REQ_ROLE;
    req.session.reviewServiceRequest = {
      serviceReqId: 'service-request-id',
      serviceId: 'service1',
      selectedRoleIds: 'roleId-1',
    };

    await getAssociateRoles(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      cancelLink: `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/access-requests/service-requests/service-request-id/services/service1/roles/roleId-1`,
    });
  });

  it('then it gets the correct "Cancel" redirect link reviewing a service request as an approver and amending the service', async () => {
    req.query.action = actions.REVIEW_SERVICE_REQ_SERVICE;
    req.session.reviewServiceRequest = {
      serviceReqId: 'service-request-id',
      serviceId: 'service1',
      selectedRoleIds: 'roleId-1',
    };

    await getAssociateRoles(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      cancelLink: `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/access-requests/service-requests/service-request-id/services/service1/roles/roleId-1`,
    });
  });

  it('then the "Back" link should redirect to select organisation page when inviting a new user and a single service is selected', async () => {
    req.session.user.isInvite = true;
    req.params.uid = undefined;

    await getAssociateRoles(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      backLink: '/approvals/org1/users/associate-services',
    });
  });

  it('then the "Back" link should redirect to select the correct page when inviting a new user and multiple services are selected', async () => {
    req.session.user.isInvite = true;
    req.params.uid = undefined;
    req.params.sid = 'service2';
    req.session.user.services = [
      {
        serviceId: 'service1',
        roles: ['role-id-1'],
      },
      {
        serviceId: 'service2',
        roles: ['role-id-2'],
      },
    ];

    await getAssociateRoles(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      backLink: `/approvals/org1/users/associate-services/service1`,
    });
  });

  it('then the "Back" link should redirect to service request review summary page when ammending a sub-service for approving - email journey', async () => {
    req.query.action = actions.REQUEST_SERVICE;
    req.session.user = {
      services: [],
      serviceId: 'service-1',
      roleIds: ['role-id-1'],
    };
    await getAssociateRoles(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      backLink: `/request-service/org1/users/user1/services/service-1/roles/%5B%22role-id-1%22%5D/approve`,
    });
  });

  it('then the "Back" link should redirect to sub-service request review summary page when ammending a sub-service for approving - email journey', async () => {
    req.query.action = actions.REQUEST_SUB_SERVICE;
    req.session.subServiceReqId = 'sub-service-req-id-1';
    req.session.user = {
      services: [],
      serviceId: 'service-1',
      roleIds: ['role-id-1'],
    };
    await getAssociateRoles(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      backLink: `https://localhost:3000/request-service/org1/users/undefined/services/service1/roles/%5B%22role-id-1%22%5D/sub-service-req-id-1/approve-roles-request`,
    });
  });

  it('then the "Back" link should redirect to review service page when adding a service for an end-user and modifying the sub-service', async () => {
    req.query.action = actions.MANAGE_SERVICE;

    await getAssociateRoles(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      backLink: '/approvals/org1/users/user1/confirm-details',
    });
  });

  it('then it should call RoleSelectionConstraintCheck if there are any role selection constraints', async () => {
    getApplication.mockReset().mockReturnValue({
      relyingParty: {
        params: {
          allowManageInvite: 'true',
          isIdOnly: 'false',
          minimumRolesRequired: '1',
          serviceId: 'service1',
          roleSelectionConstraint: {
            minAllowed: 1,
            maxAllowed: 2,
          },
        },
      },
    });

    await getAssociateRoles(req, res);
    expect(RoleSelectionConstraintCheck).toHaveBeenCalled();
  });
});
