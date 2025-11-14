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
});
