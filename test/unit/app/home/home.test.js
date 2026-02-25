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

const createService = (id, name, hideApprover = "false") => {
  return {
    id,
    name,
    description: "service description",
    isExternalService: true,
    isMigrated: true,
    isHiddenService: false,
    isIdOnlyService: false,
    relyingParty: {
      service_home: "http://service.one/login",
      redirect_uris: ["http://service.one/login/cb"],
      params: {
        hideApprover,
      },
    },
  };
};

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
    checkCacheForAllServices.mockResolvedValue({
      services: [],
    });
  });

  it("then it should render landing page if not logged in", async () => {
    await home(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe("home/views/landingPage");
  });

  it("then it should include non-hidden services in the model", async () => {
    const services = [
      createService("service-1", "1 - Visible role-based service one"),
      {
        id: "service-2",
        name: "2 - Visible ID-only service two",
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
        name: "3 - Visible param-less role-based service three",
        description: "service description",
        isExternalService: true,
        isMigrated: true,
        isHiddenService: false,
        isIdOnlyService: false,
        relyingParty: {
          service_home: "http://service.three/login",
          redirect_uris: ["http://service.three/login/cb"],
        },
      },
      createService("service-4", "4 - Hidden role-based service four", "true"),
      {
        id: "service-5",
        name: "5 - Hidden ID-only service five",
        description: "service description",
        isExternalService: true,
        isMigrated: true,
        isHiddenService: true,
        isIdOnlyService: true,
        relyingParty: {
          service_home: "http://service.five/login",
          redirect_uris: ["http://service.five/login/cb"],
          params: {
            hideApprover: "true",
          },
        },
      },
    ];
    checkCacheForAllServices.mockResolvedValue({
      services,
    });

    await home(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][1].services).toBeDefined();
    expect(res.render.mock.calls[0][1].services).toEqual([
      services[0],
      services[1],
      services[2],
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

  it("should map 'Digital Forms service' to 'ESFA Digital Forms Service'", async () => {
    const services = [createService("service-1", "Digital Forms service")];
    checkCacheForAllServices.mockResolvedValue({
      services,
    });
    await home(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][1].services[0].name).toBe(
      "ESFA Digital Forms Service",
    );
  });

  it("should map 'OPAFastForm' to 'ESFA Digital Forms Service'", async () => {
    const services = [createService("service-1", "OPAFastForm")];
    checkCacheForAllServices.mockResolvedValue({
      services,
    });
    await home(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][1].services[0].name).toBe(
      "ESFA Digital Forms Service",
    );
  });
});
