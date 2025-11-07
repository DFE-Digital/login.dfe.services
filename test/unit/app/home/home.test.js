const {
  mockRequest,
  mockResponse,
  mockLogger,
  mockAdapterConfig,
} = require("./../../../utils/jestMocks");
const Account = require("./../../../../src/infrastructure/account");
const {
  checkCacheForAllServices,
} = require("../../../../src/infrastructure/helpers/allServicesAppCache");

const home = require("./../../../../src/app/home/home");

jest.mock("./../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});
const res = mockResponse();

jest.mock("./../../../../src/infrastructure/account", () => ({
  fromContext: jest.fn(),
  getUsersById: jest.fn(),
}));
jest.mock("../../../../src/infrastructure/helpers/allServicesAppCache", () => {
  return {
    checkCacheForAllServices: jest.fn(),
  };
});
jest.mock("./../../../../src/infrastructure/logger", () => mockLogger());

describe("when displaying current organisation and service mapping", () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      user: {
        sub: "user1",
      },
    });

    res.mockResetAll();

    Account.fromContext.mockReset().mockReturnValue({
      id: "user1",
    });

    checkCacheForAllServices.mockReset();
    checkCacheForAllServices.mockReturnValue({
      services: [
        {
          id: "service-1",
          name: "Service One",
          description: "service description",
          isExternalService: true,
          isMigrated: true,
          isHiddenService: false,
          isIdOnlyService: false,
          relyingParty: {
            service_home: "http://service.one/login",
            redirect_uris: ["http://service.one/login/cb"],
            params: {
              hideApprover: "false",
            },
          },
        },
        {
          id: "service-2",
          name: "Id-only service two",
          description: "service description",
          isExternalService: true,
          isMigrated: true,
          isHiddenService: false,
          isIdOnlyService: true,
          relyingParty: {
            service_home: "http://service.two/login",
            redirect_uris: ["http://service.two/login/cb"],
            params: {
              hideApprover: "true",
            },
          },
        },
        {
          id: "service-3",
          name: "Hidden service three",
          description: "service description",
          isExternalService: true,
          isMigrated: true,
          isHiddenService: false,
          isIdOnlyService: false,
          relyingParty: {
            service_home: "http://service.three/login",
            redirect_uris: ["http://service.three/login/cb"],
            params: {
              hideApprover: "true",
            },
          },
        },
        {
          id: "service-4",
          name: "Hidden id-only service four",
          description: "service description",
          isExternalService: true,
          isMigrated: true,
          isHiddenService: true,
          isIdOnlyService: true,
          relyingParty: {
            service_home: "http://service.four/login",
            redirect_uris: ["http://service.four/login/cb"],
            params: {
              hideApprover: "true",
            },
          },
        },
      ],
    });
  });

  it("then it should render landing page if not logged in", async () => {
    await home(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe("home/views/landingPage");
  });

  it("then it should include services in model", async () => {
    await home(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][1].services).toBeDefined();
    expect(res.render.mock.calls[0][1].services).toEqual([
      {
        id: "service-2",
        name: "Id-only service two",
        description: "service description",
        isExternalService: true,
        isMigrated: true,
        isHiddenService: false,
        isIdOnlyService: true,
        relyingParty: {
          service_home: "http://service.two/login",
          redirect_uris: ["http://service.two/login/cb"],
          params: {
            hideApprover: "true",
          },
        },
      },
      {
        id: "service-1",
        name: "Service One",
        description: "service description",
        isExternalService: true,
        isMigrated: true,
        isHiddenService: false,
        isIdOnlyService: false,
        relyingParty: {
          service_home: "http://service.one/login",
          redirect_uris: ["http://service.one/login/cb"],
          params: {
            hideApprover: "false",
          },
        },
      },
    ]);
  });
  it("then it should include title in model", async () => {
    await home(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][1].title).toBe("DfE Sign-in");
  });

  it("then it should include contact url in model", async () => {
    await home(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][1].helpUrl).toBe(
      "https://localhost:3001/help",
    );
  });

  it("then it should include help assistant url in model", async () => {
    await home(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][1].helpAssistantUrl).toBe(
      "https://localhost:3001/chatBot",
    );
  });
});
