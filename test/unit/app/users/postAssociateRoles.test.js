jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('login.dfe.policy-engine');

const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
const PolicyEngine = require('login.dfe.policy-engine');

const policyEngine = {
  validate: jest.fn(),
  getPolicyApplicationResultsForUser: jest.fn(),
};

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

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users/confirm-new-user`);
  });

  it('then it should redirect to confirm user page with uid in params if no more services and existing user', async () => {
    req.session.user.uid = 'user1';
    await postAssociateRoles(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(
      `/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-details`,
    );
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

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe('service2');
  });

  it('then it should redirect to users list if no user in session', async () => {
    req.session.user = null;

    await postAssociateRoles(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users`);
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
