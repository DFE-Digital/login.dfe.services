const {
  mockRequest,
  mockResponse,
  mockAdapterConfig,
} = require("../../../utils/jestMocks");
const {
  checkCacheForAllServices,
} = require("../../../../src/infrastructure/helpers/allServicesAppCache");
const { getUserDetails } = require("../../../../src/app/users/utils");
const { getServiceRolesRaw } = require("login.dfe.api-client/services");
jest.mock("login.dfe.api-client/users", () => ({
  getUserServicesRaw: jest.fn(),
}));
const {
  getUserServiceRequestStatus,
} = require("../../../../src/app/requestService/utils");
const PolicyEngine = require("login.dfe.policy-engine");

jest.mock("login.dfe.policy-engine");
jest.mock("../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});
jest.mock("../../../../src/infrastructure/logger", () =>
  require("../../../utils/jestMocks").mockLogger(),
);
jest.mock("login.dfe.api-client/services", () => {
  return {
    getServiceRolesRaw: jest.fn(),
  };
});
const { getUserServicesRaw } = require("login.dfe.api-client/users");

jest.mock("../../../../src/app/requestService/utils", () => {
  return {
    getUserServiceRequestStatus: jest.fn(),
  };
});

jest.mock("../../../../src/infrastructure/helpers/allServicesAppCache", () => {
  return {
    checkCacheForAllServices: jest.fn(),
  };
});
jest.mock("../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});
jest.mock("login.dfe.dao", () => {
  return {
    services: {
      getUserServiceRequest: jest.fn(),
    },
  };
});

jest.mock("../../../../src/app/users/utils");

const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
  validate: jest.fn(),
};

const userAccess = [
  {
    serviceId: "service1",
    organisationId: "org1",
    accessGrantedOn: "2024-08-14T11:07:02Z",
  },
  {
    serviceId: "service4",
    organisationId: "org2",
    accessGrantedOn: "2024-06-14T11:07:02Z",
  },
];

describe("When reviewing a service request for approving", () => {
  let req;
  let res;

  let getApproveServiceRequest;

  beforeEach(() => {
    req = mockRequest();
    ((req.params = {
      orgId: "organisationId",
      uid: "endUser1",
      sid: "service1",
      rids: '["role1"]',
      reqID: "sub-service-req-ID",
    }),
      (req.session = {
        user: {
          email: "test@test.com",
          firstName: "test",
          lastName: "name",
        },
        service: {
          roles: ["role1"],
        },
      }));

    req.query.reqId = "reqId";
    req.user = {
      sub: "approver1",
      email: "approver.one@unit.test",
      organisations: [
        {
          organisation: {
            id: "organisationId",
            name: "organisationName",
          },
          role: {
            id: 10000,
            name: "Approver",
          },
        },
      ],
    };
    req.userOrganisations = [
      {
        organisation: {
          id: "organisationId",
          name: "organisationName",
        },
        role: {
          id: 10000,
          name: "Approver",
        },
      },
    ];
    res = mockResponse();

    getUserServicesRaw.mockReset().mockReturnValue(userAccess);

    getUserDetails.mockReset();
    getUserDetails.mockReturnValue({
      id: "user1",
      email: "email@email.com",
      firstName: "test",
      lastName: "name",
    });

    policyEngine.validate.mockReset().mockReturnValue([]);
    policyEngine.getPolicyApplicationResultsForUser
      .mockReset()
      .mockReturnValue({
        rolesAvailableToUser: ["role1"],
      });
    PolicyEngine.mockReset().mockImplementation(() => policyEngine);

    getServiceRolesRaw.mockReset();
    getServiceRolesRaw.mockReturnValue([
      {
        code: "role_code",
        id: "role1",
        name: "role_name",
        status: {
          id: "status_id",
        },
      },
    ]);

    checkCacheForAllServices.mockReset();
    checkCacheForAllServices.mockReturnValue({
      services: [
        {
          id: "service1",
          name: "service name",
        },
      ],
    });

    getUserServiceRequestStatus.mockReset();
    getUserServiceRequestStatus.mockReturnValue(0);

    getApproveServiceRequest =
      require("../../../../src/app/requestService/approveServiceRequest").get;
  });

  it("then it should get all services", async () => {
    await getApproveServiceRequest(req, res);

    expect(checkCacheForAllServices.mock.calls).toHaveLength(1);
  });

  it("then it should list all roles of service", async () => {
    await getApproveServiceRequest(req, res);

    expect(getServiceRolesRaw.mock.calls).toHaveLength(1);
    expect(getServiceRolesRaw.mock.calls[0][0]).toMatchObject({
      serviceId: "service1",
    });
  });

  it("then it should check if the request is not already actioned", async () => {
    await getApproveServiceRequest(req, res);

    expect(getUserServiceRequestStatus.mock.calls).toHaveLength(1);
    expect(getUserServiceRequestStatus.mock.calls[0][0]).toBe("reqId");
  });

  it("then it should return the `requestAlreadyApproved` view if the request is not already approved", async () => {
    getUserServiceRequestStatus.mockReset().mockReturnValue(1);
    await getApproveServiceRequest(req, res);
    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestService/views/requestAlreadyApproved",
    );
  });

  it("then it should return the `requestAlreadyRejected` view if the request is not already rejected", async () => {
    getUserServiceRequestStatus.mockReset().mockReturnValue(-1);
    await getApproveServiceRequest(req, res);
    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestService/views/requestAlreadyRejected",
    );
  });

  it("then it should include the csrf token", async () => {
    await getApproveServiceRequest(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
    });
  });

  it("then it should include the end user first name,last name, email address", async () => {
    await getApproveServiceRequest(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
      currentPage: "users",
      title: "Review new service for test name",
      organisationDetails: {
        organisation: {
          id: "organisationId",
          name: "organisationName",
        },
        role: {
          id: 10000,
          name: "Approver",
        },
      },
      endUserName: "test name",
      endUserEmail: "email@email.com",
      validationMessages: {},
      service: {
        serviceId: "service1",
        name: "service name",
        roles: [
          {
            code: "role_code",
            id: "role1",
            name: "role_name",
            status: {
              id: "status_id",
            },
          },
        ],
      },
      serviceUrl:
        "/approvals/organisationId/users/endUser1/associate-services?action=request-service",
      subServiceUrl:
        "/approvals/organisationId/users/endUser1/associate-services/service1?action=request-service",
    });
  });

  it("then it should include the organisation name", async () => {
    await getApproveServiceRequest(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      organisationDetails: {
        organisation: {
          name: "organisationName",
        },
      },
    });
  });

  it("then it should include the service name", async () => {
    await getApproveServiceRequest(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      service: {
        name: "service name",
      },
    });
  });

  it("then it should include the selected sub-service or role names", async () => {
    await getApproveServiceRequest(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      service: {
        roles: [{ name: "role_name" }],
      },
    });
  });

  it("then should redirect to `my services` page if there is no user in session", async () => {
    req.session.user = undefined;
    await getApproveServiceRequest(req, res);
    expect(res.redirect.mock.calls).toHaveLength(1);
  });
});
