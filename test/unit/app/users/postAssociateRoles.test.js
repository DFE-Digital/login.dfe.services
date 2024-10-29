jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('login.dfe.policy-engine');
jest.mock('./../../../../src/infrastructure/organisations', () => {
  return {
    getOrganisationAndServiceForUserV2: jest.fn(),
  };
});

const { mockRequest, mockResponse, mockConfig } = require('./../../../utils/jestMocks');
const PolicyEngine = require('login.dfe.policy-engine');
const { actions } = require('../../../../src/app/constans/actions');
const { getOrganisationAndServiceForUserV2 } = require('./../../../../src/infrastructure/organisations');

const policyEngine = {
  validate: jest.fn(),
  getPolicyApplicationResultsForUser: jest.fn(),
};

describe('when selecting the roles for a service', () => {
  let req;
  let res;
  let postAssociateRoles;
  let config;

  beforeEach(() => {
    config = mockConfig();
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
      sid: 'service1',
    };
    req.body = {
      roles: ['role1'],
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

    policyEngine.validate.mockReset().mockReturnValue([]);
    policyEngine.getPolicyApplicationResultsForUser.mockReset().mockReturnValue({
      rolesAvailableToUser: ['role1'],
    });
    PolicyEngine.mockReset().mockImplementation(() => policyEngine);

    postAssociateRoles = require('./../../../../src/app/users/associateRoles').post;
  });

  it('then it should redirect to confirm user page if no more services', async () => {
    await postAssociateRoles(req, res);

    expect(res.sessionRedirect.mock.calls).toHaveLength(1);
    expect(res.sessionRedirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users/confirm-new-user`);
  });

  it('then it should transform selected roles in an array', async () => {
    req.body.role = 'selected-role-id';
    req.session.user.uid = 'user1';
    req.query.action = actions.REQUEST_SUB_SERVICE;
    req.session.subServiceReqId = 'sub-service-req-id-1';

    await postAssociateRoles(req, res);

    const expectedRedirectUrl = `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/request-service/org1/users/user1/services/service1/roles/%5B%22selected-role-id%22%5D/sub-service-req-id-1/approve-roles-request`;
    expect(res.sessionRedirect).toHaveBeenCalledTimes(1);
    expect(res.sessionRedirect).toHaveBeenCalledWith(expectedRedirectUrl);
  });

  it('then it should get the users organisations if the user is active', async () => {
    await postAssociateRoles(req, res);

    expect(getOrganisationAndServiceForUserV2).toHaveBeenCalledTimes(1);
    expect(getOrganisationAndServiceForUserV2).toHaveBeenCalledWith('user1', 'correlationId');
  });

  it('then it should not get the users organisations if the user is in "invite" satus', async () => {
    req.params.uid = 'inv-user1';
    await postAssociateRoles(req, res);

    expect(getOrganisationAndServiceForUserV2).toHaveBeenCalledTimes(0);
  });

  it('then it should validate the policy for the user if they have access to the specified organisation', async () => {
    req.body.role = ['selected-role-id'];
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

    await postAssociateRoles(req, res);

    expect(policyEngine.validate).toHaveBeenCalledTimes(1);
    expect(policyEngine.validate).toHaveBeenCalledWith(
      'user1',
      'org1',
      'service1',
      ['selected-role-id'],
      'correlationId',
    );
  });

  it(`then it should not validate the policy for the user using the user id if they don't have access to the specified organisation`, async () => {
    req.body.role = ['selected-role-id'];
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

    await postAssociateRoles(req, res);

    expect(policyEngine.validate).toHaveBeenCalledTimes(1);
    expect(policyEngine.validate).toHaveBeenCalledWith(
      undefined,
      'org1',
      'service1',
      ['selected-role-id'],
      'correlationId',
    );
  });

  it('then it should redirect to confirm user page with uid in params if no more services and existing user', async () => {
    req.session.user.uid = 'user1';
    await postAssociateRoles(req, res);

    expect(res.sessionRedirect.mock.calls).toHaveLength(1);
    expect(res.sessionRedirect.mock.calls[0][0]).toBe(
      `/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-details`,
    );
  });

  it('then it should redirect to "Review request" page when changing the sub-service in a service request', async () => {
    req.query.action = actions.REVIEW_SERVICE_REQ_SERVICE;
    req.body.role = ['role1'];
    req.session.user.uid = 'user1';
    req.session = {
      ...req.session,
      reviewServiceRequest: {
        serviceReqId: 'service-req-id',
        serviceId: 'service1',
      },
    };

    await postAssociateRoles(req, res);

    const expectedRedirectUrl = `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/access-requests/service-requests/service-req-id/services/service1/roles/role1`;
    expect(res.sessionRedirect).toHaveBeenCalledTimes(1);
    expect(res.sessionRedirect).toHaveBeenCalledWith(expectedRedirectUrl);
  });

  it('then it should redirect to "Review request" page when changing the service in a service request', async () => {
    req.query.action = actions.REVIEW_SERVICE_REQ_ROLE;
    req.body.role = ['role1'];
    req.session.user.uid = 'user1';
    req.session = {
      ...req.session,
      reviewServiceRequest: {
        serviceReqId: 'service-req-id',
        serviceId: 'service1',
      },
    };

    await postAssociateRoles(req, res);

    const expectedRedirectUrl = `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/access-requests/service-requests/service-req-id/services/service1/roles/role1`;
    expect(res.sessionRedirect).toHaveBeenCalledTimes(1);
    expect(res.sessionRedirect).toHaveBeenCalledWith(expectedRedirectUrl);
  });

  it('then it should redirect to "Review request" page when changing the sub-service in a service request with correct path if no role selected', async () => {
    req.query.action = actions.REVIEW_SERVICE_REQ_SERVICE;
    req.body.role = [];
    req.session.user.uid = 'user1';
    req.session = {
      ...req.session,
      reviewServiceRequest: {
        serviceReqId: 'service-req-id',
        serviceId: 'service1',
      },
    };

    await postAssociateRoles(req, res);

    const expectedRedirectUrl = `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/access-requests/service-requests/service-req-id/services/service1/roles/null`;
    expect(res.sessionRedirect).toHaveBeenCalledTimes(1);
    expect(res.sessionRedirect).toHaveBeenCalledWith(expectedRedirectUrl);
  });

  it('then it should redirect to "Review request" page when changing the service in a service request with correct path if no role selected', async () => {
    req.query.action = actions.REVIEW_SERVICE_REQ_ROLE;
    req.body.role = [];
    req.session.user.uid = 'user1';
    req.session = {
      ...req.session,
      reviewServiceRequest: {
        serviceReqId: 'service-req-id',
        serviceId: 'service1',
      },
    };

    await postAssociateRoles(req, res);

    const expectedRedirectUrl = `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/access-requests/service-requests/service-req-id/services/service1/roles/null`;
    expect(res.sessionRedirect).toHaveBeenCalledTimes(1);
    expect(res.sessionRedirect).toHaveBeenCalledWith(expectedRedirectUrl);
  });

  it('then it should redirect to "Review request" page when changing the sub-service in a sub-service request from email journey', async () => {
    req.session.user.uid = 'user1';
    req.query.action = actions.REQUEST_SUB_SERVICE;
    req.session.subServiceReqId = 'sub-service-req-id-1';

    await postAssociateRoles(req, res);

    const expectedRedirectUrl = `https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/request-service/org1/users/user1/services/service1/roles/%5B%5D/sub-service-req-id-1/approve-roles-request`;
    expect(res.sessionRedirect).toHaveBeenCalledTimes(1);
    expect(res.sessionRedirect).toHaveBeenCalledWith(expectedRedirectUrl);
  });

  it('then it should redirect to the next service if one exists', async () => {
    req.session.user.services = [
      {
        serviceId: 'service1',
        roles: [],
      },
      {
        serviceId: 'service2',
        roles: [],
      },
    ];
    await postAssociateRoles(req, res);

    expect(res.sessionRedirect.mock.calls).toHaveLength(1);
    expect(res.sessionRedirect.mock.calls[0][0]).toBe('service2');
  });

  it('then it should redirect to users list if no user in session', async () => {
    req.session.user = null;

    await postAssociateRoles(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe('/approvals/users');
  });

  it('then it should render view with error if selection do not meet requirements of service', async () => {
    policyEngine.validate.mockReturnValue([{ message: 'selections not valid' }]);

    await postAssociateRoles(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(`users/views/associateRoles`);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      validationMessages: {
        roles: ['selections not valid'],
      },
    });
  });
});
