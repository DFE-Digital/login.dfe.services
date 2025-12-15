jest.mock("login.dfe.policy-engine");
jest.mock("./../../../../src/infrastructure/config", () =>
  require("../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("../../../utils/jestMocks").mockLogger(),
);
jest.mock("./../../../../src/app/users/utils");
jest.mock("./../../../../src/infrastructure/organisations");
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

const { mockRequest, mockResponse } = require("../../../utils/jestMocks");

const {
  checkForActiveRequests,
} = require("../../../../src/app/requestService/utils");
const {
  getOrganisationAndServiceForUserV2,
} = require("../../../../src/infrastructure/organisations");
jest.mock("../../../../src/infrastructure/organisations", () => {
  return {
    getOrganisationAndServiceForUserV2: jest.fn(),
  };
});
jest.mock("../../../../src/app/requestService/utils", () => {
  return {
    checkForActiveRequests: jest.fn(),
  };
});
const PolicyEngine = require("login.dfe.policy-engine");
const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
};

describe("when posting service and the request has already been requested", () => {
  let req;
  let res;
  let post;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: "user1",
      orgId: "organisationId",
      sid: "service1",
    };
    req.body = { service: "service1" };
    req.session = {
      organisationDetails: [
        {
          approvers: [{ user_id: "user2" }],
          organisation: {
            id: "organisationId",
            name: "organisationName",
            approvers: [{ user_id: "user2" }],
          },
          role: {
            id: 0,
            name: "category name",
          },
        },
      ],
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
      services: [
        {
          serviceId: "service1",
          roles: [],
        },
      ],
      organisations: [
        {
          approvers: [{ user_id: "user2" }],
          organisation: {
            id: "organisationId",
            name: "organisationName",
            approvers: [{ user_id: "user2" }],
          },
          role: {
            id: 0,
            name: "category name",
          },
        },
      ],
    };
    req.selectServiceID = { selectServiceID: "service1" };
    req.organisationDetails = [
      {
        approvers: [{ user_id: "user2" }],
        organisation: {
          id: "organisationId",
          name: "organisationName",
          approvers: [{ user_id: "user2" }],
        },
        role: {
          id: 0,
          name: "category name",
        },
      },
    ];
    req.serviceDetails = { name: "service name" };
    req.userOrganisations = [
      {
        approvers: [{ user_id: "user2" }],
        organisation: {
          id: "organisationId",
          name: "organisationName",
          approvers: [{ user_id: "user2" }],
        },
        role: {
          id: 0,
          name: "category name",
        },
      },
    ];
    res = mockResponse();

    getOrganisationAndServiceForUserV2.mockReset();
    getOrganisationAndServiceForUserV2.mockReturnValue([
      {
        organisation: {
          id: "organisationId",
        },
      },
    ]);

    checkCacheForAllServices.mockReset();
    checkCacheForAllServices.mockReturnValue({
      services: [
        {
          id: "service1",
          isExternalService: true,
          isMigrated: true,
          name: "Service One",
        },
        {
          id: "service2",
          isExternalService: true,
          isMigrated: true,
          name: "Service two",
        },
      ],
    });

    checkForActiveRequests.mockReset();
    checkForActiveRequests.mockReturnValue([new Date()]);

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

    post = require("../../../../src/app/requestService/requestService").post;
  });

  it("then it should display the my service page", async () => {
    await post(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/my-services");
  });
});
