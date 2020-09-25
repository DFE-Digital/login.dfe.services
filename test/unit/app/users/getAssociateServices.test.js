jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/applications', () => {
  return {
    getAllServices: jest.fn(),
  };
});
jest.mock('./../../../../src/app/users/utils');
jest.mock('login.dfe.policy-engine');

const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
const { getAllServices } = require('./../../../../src/infrastructure/applications');
const { getAllServicesForUserInOrg } = require('./../../../../src/app/users/utils');
const PolicyEngine = require('login.dfe.policy-engine');

const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
  validate: jest.fn(),
};

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

    getAllServices.mockReset();
    getAllServices.mockReturnValue({
      services: [
        {
          id: 'service1',
          dateActivated: '10/10/2018',
          name: 'service name',
          status: 'active',
          isExternalService: true,
          relyingParty: {
            params: {},
          },
        },
      ],
    });
    getAllServicesForUserInOrg.mockReset();
    getAllServicesForUserInOrg.mockReturnValue([
      {
        id: 'service2',
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

  it('then it should check if external service with no params', async () => {
    getAllServices.mockReset();
    getAllServices.mockReturnValue({
      services: [
        {
          id: 'service1',
          dateActivated: '10/10/2018',
          name: 'service name',
          status: 'active',
          isExternalService: true,
          relyingParty: {},
        },
      ],
    });
    await getAssociateServices(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      services: [
        {
          id: 'service1',
          dateActivated: '10/10/2018',
          name: 'service name',
          status: 'active',
        },
      ],
    });
  });

  it('then it should display service if external service with params but no hideApprover', async () => {
    getAllServices.mockReset();
    getAllServices.mockReturnValue({
      services: [
        {
          id: 'service1',
          dateActivated: '10/10/2018',
          name: 'service name',
          status: 'active',
          isExternalService: true,
          relyingParty: {
            params: {},
          },
        },
      ],
    });
    await getAssociateServices(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      services: [
        {
          id: 'service1',
          dateActivated: '10/10/2018',
          name: 'service name',
          status: 'active',
        },
      ],
    });
  });

  it('then it should not display service if not external service', async () => {
    getAllServices.mockReset();
    getAllServices.mockReturnValue({
      services: [
        {
          id: 'service1',
          dateActivated: '10/10/2018',
          name: 'service name',
          status: 'active',
          isExternalService: false,
          relyingParty: {
            params: {
              hideApprover: false,
            },
          },
        },
      ],
    });
    await getAssociateServices(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      services: [],
    });
  });

  it('then it should display service if external service with params but hideApprover false', async () => {
    getAllServices.mockReset();
    getAllServices.mockReturnValue({
      services: [
        {
          id: 'service1',
          dateActivated: '10/10/2018',
          name: 'service name',
          status: 'active',
          isExternalService: true,
          relyingParty: {
            params: {
              hideApprover: false,
            },
          },
        },
      ],
    });
    await getAssociateServices(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      services: [
        {
          id: 'service1',
          dateActivated: '10/10/2018',
          name: 'service name',
          status: 'active',
        },
      ],
    });
  });

  it('then it should not display service if external service with params but hideApprover true', async () => {
    getAllServices.mockReset();
    getAllServices.mockReturnValue({
      services: [
        {
          id: 'service1',
          dateActivated: '10/10/2018',
          name: 'service name',
          status: 'active',
          isExternalService: true,
          relyingParty: {
            params: {
              hideApprover: 'true',
            },
          },
        },
      ],
    });
    await getAssociateServices(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      services: [],
    });
  });

  it('then it should include the services', async () => {
    await getAssociateServices(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      services: [
        {
          id: 'service1',
          dateActivated: '10/10/2018',
          name: 'service name',
          status: 'active',
        },
      ],
    });
  });
  it('then it should exclude services that are not available based on policies', async () => {
    getAllServices.mockReturnValue({
      services: [
        {
          id: 'service1',
          name: 'service one',
          isExternalService: true,
          relyingParty: {
            params: {},
          },
        },
        {
          id: 'service2',
          name: 'service two',
          isExternalService: true,
          relyingParty: {
            params: {},
          },
        },
      ],
    });
    getAllServicesForUserInOrg.mockReturnValue([]);
    policyEngine.getPolicyApplicationResultsForUser.mockImplementation((userId, organisationId, serviceId) => ({
      policiesAppliedForUser: [],
      rolesAvailableToUser: [],
      serviceAvailableToUser: serviceId === 'service2',
    }));

    await getAssociateServices(req, res);

    expect(policyEngine.getPolicyApplicationResultsForUser).toHaveBeenCalledTimes(2);
    expect(policyEngine.getPolicyApplicationResultsForUser).toHaveBeenCalledWith(undefined, 'org1', 'service1', req.id);
    expect(policyEngine.getPolicyApplicationResultsForUser).toHaveBeenCalledWith(undefined, 'org1', 'service2', req.id);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      services: [
        {
          id: 'service2',
          name: 'service two',
          isExternalService: true,
          relyingParty: {
            params: {},
          },
        },
      ],
    });
  });
});
