jest.mock("./../../../../src/app/users/utils");
const {
  mockRequest,
  mockResponse,
  mockLogger,
  mockAdapterConfig,
} = require("./../../../utils/jestMocks");
jest.mock("./../../../../src/infrastructure/logger", () => mockLogger());
jest.mock("./../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});
const {
  checkCacheForAllServices,
} = require("../../../../src/infrastructure/helpers/allServicesAppCache");
jest.mock("../../../../src/infrastructure/helpers/allServicesAppCache", () => {
  return {
    checkCacheForAllServices: jest.fn(),
  };
});

const mockGetOrganisationAndServiceForUser = jest.fn().mockReturnValue([
  {
    organisation: {
      id: "org1",
    },
    services: [
      {
        id: "service1",
        dateActivated: "10/10/2018",
        name: "service name",
        status: "active",
      },
    ],
  },
]);

jest.mock("./../../../../src/infrastructure/organisations", () => {
  return {
    getOrganisationAndServiceForUser: mockGetOrganisationAndServiceForUser,
  };
});

const {
  getUserDetails,
  getApproverOrgsFromReq,
} = require("./../../../../src/app/users/utils");
const getServices = require("./../../../../src/app/users/getServices");

describe("when displaying the users services", () => {
  let req;
  let res;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: "user1",
      orgId: "org1",
    };
    req.user = {
      sub: "user1",
      email: "user.one@unit.test",
      organisations: [
        {
          organisation: {
            id: "organisationId",
            name: "organisationName",
          },
          role: {
            id: 0,
            name: "category name",
          },
        },
      ],
    };
    req.userOrganisations = [
      {
        organisation: {
          id: "org1",
          name: "organisationName",
        },
        role: {
          id: 10000,
          name: "category name",
        },
      },
    ];
    res = mockResponse();

    getUserDetails.mockReset();
    getUserDetails.mockReturnValue({
      id: "user1",
    });

    checkCacheForAllServices.mockReset();
    checkCacheForAllServices.mockReturnValue({
      services: [
        {
          id: "service1",
          isExternalService: true,
          isMigrated: true,
          isHiddenService: false,
          name: "Service One",
        },
        {
          id: "service2",
          isExternalService: true,
          isMigrated: true,
          isHiddenService: false,
          name: "Service two",
        },
      ],
    });

    getApproverOrgsFromReq.mockReset();
    getApproverOrgsFromReq.mockReturnValue([
      {
        organisation: {
          id: "org1",
          name: "organisationName",
        },
        role: {
          id: 10000,
          name: "category name",
        },
      },
    ]);
  });

  it("then it should get the users details", async () => {
    await getServices(req, res);

    expect(getUserDetails.mock.calls).toHaveLength(1);
    expect(getUserDetails.mock.calls[0][0]).toBe(req);
    expect(res.render.mock.calls[0][1].user).toMatchObject({
      id: "user1",
    });
  });

  it("then it should get the services for a user", async () => {
    await getServices(req, res);

    expect(mockGetOrganisationAndServiceForUser.mock.calls).toHaveLength(1);
    expect(mockGetOrganisationAndServiceForUser.mock.calls[0][0]).toBe("user1");
  });

  it("then it should return the services view", async () => {
    await getServices(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe("users/views/services");
  });

  it("then it should include csrf token", async () => {
    await getServices(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
    });
  });

  it("should exclude an ID-only service only when all four hide conditions are truthy", async () => {
    checkCacheForAllServices.mockReturnValue({
      services: [
        {
          id: "service1",
          isExternalService: true,
          isIdOnlyService: true,
          isHiddenService: 1,
          name: "Fully Hidden ID-only Service",
          relyingParty: {
            params: {
              hideApprover: "true",
              hideSupport: "true",
              helpHidden: "true",
            },
          },
        },
      ],
    });

    await getServices(req, res);

    const userOrgs = res.render.mock.calls[0][1].visibleUserOrgs;
    const displayedServiceIds = userOrgs
      .flatMap((o) => o.displayedServices)
      .map((s) => s.id);
    expect(displayedServiceIds).not.toContain("service1");
  });

  it("should include an ID-only service with isHiddenService=true when not all params are truthy", async () => {
    checkCacheForAllServices.mockReturnValue({
      services: [
        {
          id: "service1",
          isExternalService: true,
          isIdOnlyService: true,
          isHiddenService: true,
          name: "Partially Hidden ID-only Service",
          relyingParty: { params: { hideApprover: "true" } },
        },
      ],
    });

    await getServices(req, res);

    const userOrgs = res.render.mock.calls[0][1].visibleUserOrgs;
    const displayedServiceIds = userOrgs
      .flatMap((o) => o.displayedServices)
      .map((s) => s.id);
    expect(displayedServiceIds).toContain("service1");
  });

  it("should include an ID-only service with isHiddenService=false even when hideApprover is true", async () => {
    checkCacheForAllServices.mockReturnValue({
      services: [
        {
          id: "service1",
          isExternalService: true,
          isIdOnlyService: true,
          isHiddenService: false,
          name: "Visible ID-only Service",
          relyingParty: { params: { hideApprover: "true" } },
        },
      ],
    });

    await getServices(req, res);

    const userOrgs = res.render.mock.calls[0][1].visibleUserOrgs;
    const displayedServiceIds = userOrgs
      .flatMap((o) => o.displayedServices)
      .map((s) => s.id);
    expect(displayedServiceIds).toContain("service1");
  });

  describe("when an invite journey is in progress during a user profile page visit", () => {
    const inviteState = {
      isInvite: true,
      uid: "inv-abc123",
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@example.com",
      services: [{ serviceId: "service1", roles: [] }],
    };

    it("then it should save invite state to session.savedInvite before overwriting session.user", async () => {
      req.session.user = { ...inviteState };

      await getServices(req, res);

      expect(req.session.savedInvite).toBeDefined();
      expect(req.session.savedInvite.isInvite).toBe(true);
      expect(req.session.savedInvite.email).toBe("alice@example.com");
      expect(req.session.savedInvite.uid).toBe("inv-abc123");
    });

    it("then it should remove isInvite from session.user after overwriting with profile user data", async () => {
      req.session.user = { ...inviteState };

      await getServices(req, res);

      expect(req.session.user.isInvite).toBeUndefined();
      expect(req.session.user.services).toEqual([]);
    });

    it("then it should not set session.savedInvite when there is no active invite in the session", async () => {
      req.session.user = { uid: "someuser", services: [] };

      await getServices(req, res);

      expect(req.session.savedInvite).toBeUndefined();
    });
  });
});
