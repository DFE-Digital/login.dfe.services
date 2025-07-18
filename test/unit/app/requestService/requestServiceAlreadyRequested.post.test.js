jest.mock("login.dfe.policy-engine");
jest.mock("./../../../../src/infrastructure/config", () =>
  require("../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("../../../utils/jestMocks").mockLogger(),
);
jest.mock("./../../../../src/app/users/utils");
jest.mock("./../../../../src/infrastructure/organisations");
jest.mock("login.dfe.dao", () => {
  return {
    services: {
      list: async () => {
        return {
          count: 10,
          rows: [
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
        };
      },
    },
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
  getAllServicesForUserInOrg,
} = require("../../../../src/app/users/utils");
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

    checkForActiveRequests.mockReset();
    checkForActiveRequests.mockReturnValue([new Date()]);

    getAllServicesForUserInOrg.mockReset();
    getAllServicesForUserInOrg.mockReturnValue([
      {
        id: "service1",
        dateActivated: "10/10/2018",
        name: "service name",
        status: "active",
        isExternalService: true,
      },
    ]);

    policyEngine.getPolicyApplicationResultsForUser
      .mockReset()
      .mockReturnValue({
        policiesAppliedForUser: [],
        rolesAvailableToUser: [],
        serviceAvailableToUser: true,
      });
    PolicyEngine.mockReset().mockImplementation(() => policyEngine);

    post = require("../../../../src/app/requestService/requestService").post;
  });

  it("then it should display the my service page", async () => {
    await post(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/my-services");
  });
});
