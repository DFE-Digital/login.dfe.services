jest.mock("login.dfe.policy-engine");
jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);
jest.mock("./../../../../src/app/users/utils");
jest.mock("./../../../../src/app/users/utils");
jest.mock("login.dfe.api-client/organisations", () => ({
  getOrganisationRaw: jest.fn(),
}));

const {
  checkCacheForAllServices,
} = require("../../../../src/infrastructure/helpers/allServicesAppCache");
jest.mock("../../../../src/infrastructure/helpers/allServicesAppCache", () => {
  return {
    checkCacheForAllServices: jest.fn(),
  };
});

jest.mock("login.dfe.dao", () => {
  return {
    directories: {
      fetchUserBanners: async () => {
        return null;
      },
      createUserBanners: async () => {
        return Promise.resolve(true);
      },
    },
  };
});

const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");
const {
  getAllServicesForUserInOrg,
} = require("./../../../../src/app/users/utils");

const PolicyEngine = require("login.dfe.policy-engine");
const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
};

describe("when displaying the request a service page", () => {
  let req;
  let res;
  let get;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: "user1",
      orgId: "org1",
      sid: "service1",
    };
    req.session = {
      user: {
        email: "test@test.com",
        firstName: "test",
        lastName: "name",
        services: [
          {
            serviceId: "service1",
            roles: [],
          },
        ],
      },
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
          id: "organisationId",
          name: "organisationName",
        },
        role: {
          id: 0,
          name: "category name",
        },
      },
    ];
    res = mockResponse();

    checkCacheForAllServices.mockReset();
    checkCacheForAllServices.mockReturnValue({
      services: [
        {
          id: "service1",
          isExternalService: true,
          isHiddenForApprover: false,
          isMigrated: true,
          name: "Service One",
        },
        {
          id: "service2",
          isExternalService: true,
          isHiddenForApprover: false,
          isMigrated: true,
          name: "Service two",
        },
      ],
    });

    getAllServicesForUserInOrg.mockReset();
    getAllServicesForUserInOrg.mockReturnValue([
      {
        id: "service2",
        dateActivated: "10/10/2018",
        name: "service name",
        status: "active",
        isExternalService: true,
      },
    ]);

    policyEngine.getPolicyApplicationResultsForUser
      .mockReset()
      .mockReturnValue([
        {
          id: "service1",
          policiesAppliedForUser: [],
          rolesAvailableToUser: [],
          serviceAvailableToUser: true,
        },
      ]);
    PolicyEngine.mockReset().mockImplementation(() => policyEngine);

    const {
      getOrganisationRaw,
    } = require("login.dfe.api-client/organisations");
    getOrganisationRaw
      .mockReset()
      .mockResolvedValue({ category: { id: "001" } });

    get = require("./../../../../src/app/requestService/requestService").get;
  });

  it("then it should display the select service page", async () => {
    await get(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestService/views/requestService",
    );
  });

  it("then it should include csrf token", async () => {
    await get(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
    });
  });

  it("should exclude a service with isHiddenForApprover: true from results", async () => {
    checkCacheForAllServices.mockReturnValue({
      services: [
        {
          id: "service-visible",
          isExternalService: true,
          isHiddenForApprover: false,
          isMigrated: true,
          name: "Visible Service",
        },
        {
          id: "service-hidden",
          isExternalService: true,
          isHiddenForApprover: true,
          isMigrated: true,
          name: "Hidden Service",
        },
      ],
    });
    getAllServicesForUserInOrg.mockReturnValue([]);
    policyEngine.getPolicyApplicationResultsForUser.mockImplementation(
      (userId, organisationId, serviceIds) =>
        serviceIds.map((id) => ({
          id,
          policiesAppliedForUser: [],
          rolesAvailableToUser: [],
          serviceAvailableToUser: true,
        })),
    );

    await get(req, res);

    const services = res.render.mock.calls[0][1].services;
    expect(services.map((s) => s.id)).not.toContain("service-hidden");
    expect(services.map((s) => s.id)).toContain("service-visible");
  });

  it("should include a service with isHiddenForApprover: false in results", async () => {
    checkCacheForAllServices.mockReturnValue({
      services: [
        {
          id: "service-shown",
          isExternalService: true,
          isHiddenForApprover: false,
          isMigrated: true,
          name: "Shown Service",
        },
      ],
    });
    getAllServicesForUserInOrg.mockReturnValue([]);
    policyEngine.getPolicyApplicationResultsForUser.mockReturnValue([
      {
        id: "service-shown",
        policiesAppliedForUser: [],
        rolesAvailableToUser: [],
        serviceAvailableToUser: true,
      },
    ]);

    await get(req, res);

    const services = res.render.mock.calls[0][1].services;
    expect(services.map((s) => s.id)).toContain("service-shown");
  });
});
