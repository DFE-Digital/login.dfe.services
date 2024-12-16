jest.mock("./../../../../src/infrastructure/account", () => ({
  fromContext: jest.fn(),
  getUsersById: jest.fn(),
  getById: jest.fn(),
}));
jest.mock("./../../../../src/infrastructure/account", () => ({
  fromContext: jest.fn(),
  getUsersById: jest.fn(),
  getById: jest.fn(),
}));
jest.mock("./../../../../src/infrastructure/applications", () => ({
  getApplication: jest.fn(),
}));

jest.mock("./../../../../src/infrastructure/access", () => ({
  getServicesForUser: jest.fn(),
}));

jest.mock("./../../../../src/infrastructure/logger", () => ({
  info: jest.fn(),
  audit: jest.fn(),
}));

jest.mock("../../../../src/app/home/userBannersHandlers", () => {
  return {
    fetchSubServiceAddedBanners: jest.fn(),
    fetchNewServiceBanners: jest.fn(),
  };
});

jest.mock("login.dfe.dao", () => {
  return {
    directories: {
      fetchUserBanners: async (userId, bannerId) => {
        return null;
      },
    },
  };
});

jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);

jest.mock("./../../../../src/infrastructure/organisations", () => ({
  getOrganisationAndServiceForUser: jest.fn(),
  getPendingRequestsAssociatedWithUser: jest.fn(),
  getLatestRequestAssociatedWithUser: jest.fn(),
}));

const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");
const Account = require("./../../../../src/infrastructure/account");
const {
  getServicesForUser,
} = require("./../../../../src/infrastructure/access");
const {
  getApplication,
} = require("./../../../../src/infrastructure/applications");
const {
  getOrganisationAndServiceForUser,
  getPendingRequestsAssociatedWithUser,
  getLatestRequestAssociatedWithUser,
} = require("./../../../../src/infrastructure/organisations");
const getServices = require("./../../../../src/app/home/getServices");
const {
  fetchSubServiceAddedBanners,
  fetchNewServiceBanners,
} = require("../../../../src/app/home/userBannersHandlers");
const flash = require("login.dfe.express-flash-2");

const res = mockResponse();
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
  {
    serviceId: "service3",
    organisationId: "org3",
    accessGrantedOn: "2024-06-14T11:07:02Z",
  },
  {
    serviceId: "service4",
    organisationId: "org4",
    accessGrantedOn: "2024-06-14T11:07:02Z",
  },
];
const application = {
  id: "service1",
  name: "Service One",
  relyingParty: {
    service_home: "http://service.one/login",
    redirect_uris: ["http://service.one/login/cb"],
  },
  description: "Service One Description",
};

describe("when displaying the users services", () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      user: {
        id: "user1",
      },
    });

    res.mockResetAll();
    res.locals = {
      flash: undefined,
    };

    Account.fromContext.mockReset().mockReturnValue({
      id: "user1",
    });

    getServicesForUser.mockReset().mockReturnValue(userAccess);
    getOrganisationAndServiceForUser
      .mockReset()
      .mockReturnValue([
        {
          organisation: {
            id: "org1",
            name: "Organisation 1",
            status: { id: 1 },
          },
        },
        {
          organisation: {
            id: "org2",
            name: "Organisation 2",
            status: { id: 1 },
          },
        },
        {
          organisation: {
            id: "org3",
            name: "Organisation 3",
            status: { id: 0 },
          },
        },
        {
          organisation: {
            id: "org4",
            name: "Organisation 4",
            status: { id: 1 },
          },
        },
      ]);
    getPendingRequestsAssociatedWithUser.mockReset().mockReturnValue([]);
    getLatestRequestAssociatedWithUser.mockReset().mockReturnValue(undefined);

    fetchNewServiceBanners.mockReset().mockReturnValue([
      { id: "banner1", userId: "user1", serviceName: "bobs burgers" },
      { id: "banner2", userId: "user1", serviceName: "Analysis reports" },
    ]);

    getApplication.mockReset().mockReturnValue(application);
    Account.getById.mockReset().mockReturnValue({
      claims: {
        sub: "user1",
      },
    });
  });

  it("then it should render the logged in services view", async () => {
    await getServices(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe("home/views/services");
  });

  it("then it should include current user account in model", async () => {
    await getServices(req, res);

    expect(res.render.mock.calls[0][1].user).toBeDefined();
    expect(res.render.mock.calls[0][1].user).toEqual({
      id: "user1",
    });
  });

  it("then it should include mapped services for user", async () => {
    await getServices(req, res);

    expect(res.render.mock.calls[0][1].services).toBeDefined();
    expect(res.render.mock.calls[0][1].services).toHaveLength(3);
    expect(res.render.mock.calls[0][1].services[0]).toEqual({
      id: "service1",
      name: "Service One",
      serviceUrl: "http://service.one/login",
      description: "Service One Description",
      accessGrantedOn: "2024-08-14T11:07:02Z",
      organisations: [{ id: "org1", name: "Organisation 1" }],
    });
  });

  it("then it should include mapped services for user when one organisation is present", async () => {
    await getServices(req, res);

    expect(res.render.mock.calls[0][1].services).toBeDefined();
    expect(res.render.mock.calls[0][1].services[0].organisations).toHaveLength(
      1,
    );
    expect(res.render.mock.calls[0][1].services[0].organisations[0]).toEqual({
      id: "org1",
      name: "Organisation 1",
    });
  });

  it("then it should include mapped services for user when multiple organisations are present", async () => {
    await getServices(req, res);

    expect(res.render.mock.calls[0][1].services).toBeDefined();
    expect(res.render.mock.calls[0][1].services[1].organisations).toHaveLength(
      2,
    );
    expect(res.render.mock.calls[0][1].services[1].organisations[0]).toEqual({
      id: "org2",
      name: "Organisation 2",
    });

    expect(res.render.mock.calls[0][1].services[1].organisations[1]).toEqual({
      id: "org4",
      name: "Organisation 4",
    });
  });

  it("then it should include mapped services for user when organisation status id is 0", async () => {
    await getServices(req, res);

    expect(res.render.mock.calls[0][1].services).toBeDefined();
    expect(res.render.mock.calls[0][1].services[2].organisations).toHaveLength(
      0,
    );
    expect(res.render.mock.calls[0][1].services[2].organisations).toEqual([]);
  });

  it("then it should include mapped services for user when multiple services and multiple organisations are present", async () => {
    await getServices(req, res);

    expect(res.render.mock.calls[0][1].services).toBeDefined();
    expect(res.render.mock.calls[0][1].services).toHaveLength(3);
    expect(res.render.mock.calls[0][1].services[0].organisations).toHaveLength(
      1,
    );
    expect(res.render.mock.calls[0][1].services[1].organisations).toHaveLength(
      2,
    );
    expect(res.render.mock.calls[0][1].services[2].organisations).toHaveLength(
      0,
    );
    expect(res.render.mock.calls[0][1].services[2].organisations).toEqual([]);
  });

  it("then it Services should be filtered by service id", async () => {
    await getServices(req, res);

    expect(res.render.mock.calls[0][1].services).toBeDefined();
    expect(res.render.mock.calls[0][1].services).toHaveLength(3);
    expect(
      res.render.mock.calls[0][1].services.filter((s) => s.id === "service4"),
    ).toHaveLength(1);
  });

  it("then it should render services view with no services if user has none", async () => {
    getServicesForUser.mockReturnValue(undefined);
    getOrganisationAndServiceForUser.mockReturnValue([]);

    await getServices(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe("home/views/services");
    expect(res.render.mock.calls[0][1].services).toBeDefined();
    expect(res.render.mock.calls[0][1].services).toHaveLength(0);
  });

  it("then it should map serviceUrl from service_home when available", async () => {
    getApplication.mockReset().mockReturnValue({
      name: "Service One",
      relyingParty: {
        service_home: "http://service.one/login",
        redirect_uris: ["http://service.one/login"],
      },
    });

    await getServices(req, res);

    expect(res.render.mock.calls[0][1].services[0].serviceUrl).toBe(
      "http://service.one/login",
    );
  });

  it("then it should map serviceUrl from first redirect if service_home not available", async () => {
    getApplication.mockReset().mockReturnValue({
      name: "Service One",
      relyingParty: {
        redirect_uris: ["http://service.one/login/cb"],
      },
    });

    await getServices(req, res);

    expect(res.render.mock.calls[0][1].services[0].serviceUrl).toBe(
      "http://service.one/login",
    );
  });

  it('then it should fetch and display "Sub-service added" banners if there is a user in session and the banners exist', async () => {
    await getServices(req, res);

    expect(fetchSubServiceAddedBanners.mock.calls).toHaveLength(1);
    expect(fetchSubServiceAddedBanners.mock.calls[0][0]).toBe("user1");
  });
  it('then it should fetch and display "Service added" banners if there is a user in session and the banners exist', async () => {
    await getServices(req, res);

    expect(fetchNewServiceBanners.mock.calls).toHaveLength(1);
    expect(fetchNewServiceBanners.mock.calls[0][0]).toBe("user1");
  });
  it('then it should not fetch and display "Sub-service added" banners if there is no user in session', async () => {
    req.user.id = undefined;
    await getServices(req, res);

    expect(fetchSubServiceAddedBanners.mock.calls).toHaveLength(0);
  });

  it("then it should set serviceUrl to # if no service_home or redirects available", async () => {
    getApplication.mockReset().mockReturnValue({
      name: "Service One",
      relyingParty: {
        redirect_uris: [],
      },
    });

    await getServices(req, res);

    expect(res.render.mock.calls[0][1].services[0].serviceUrl).toBe(
      "http://service.one/login",
    );
  });
});
