jest.mock("./../../../../src/infrastructure/access", () => {
  return {
    addInvitationService: jest.fn(),
    addUserService: jest.fn(),
  };
});
jest.mock("login.dfe.api-client/services", () => {
  return {
    getServiceRolesRaw: jest.fn(),
  };
});
jest.mock(
  "./../../../../src/infrastructure/helpers/allServicesAppCache",
  () => {
    return {
      checkCacheForAllServices: jest.fn(),
    };
  },
);

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
  };
});

const { getServiceRolesRaw } = require("login.dfe.api-client/services");
const {
  checkCacheForAllServices,
} = require("./../../../../src/infrastructure/helpers/allServicesAppCache");

describe("when displaying the confirm new user view", () => {
  let req;
  let res;

  let getConfirmNewUser;

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

    getServiceRolesRaw.mockReset();
    getServiceRolesRaw.mockReturnValue([
      {
        code: "role_code",
        id: "role_id",
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

    getConfirmNewUser =
      require("./../../../../src/app/users/confirmNewUser").get;
  });

  it("then it should get all services", async () => {
    await getConfirmNewUser(req, res);

    expect(checkCacheForAllServices.mock.calls).toHaveLength(1);
  });

  it("then it should list all roles of service", async () => {
    await getConfirmNewUser(req, res);

    expect(getServiceRolesRaw.mock.calls).toHaveLength(1);
    expect(getServiceRolesRaw).toBeCalledWith({ serviceId: "service1" });
  });

  it("then it should return the confirm new user view", async () => {
    await getConfirmNewUser(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe("users/views/confirmNewUser");
  });

  it("then it should include csrf token", async () => {
    await getConfirmNewUser(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
    });
  });

  it("then it should include the users details", async () => {
    await getConfirmNewUser(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      user: {
        firstName: "test",
        lastName: "name",
        email: "test@test.com",
        isInvite: false,
        uid: "",
      },
    });
  });

  it("then it should include the service details", async () => {
    await getConfirmNewUser(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      services: [
        {
          id: "service1",
          name: "service name",
          roles: [],
        },
      ],
    });
  });
});
