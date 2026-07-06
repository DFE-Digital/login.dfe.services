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

const createService = (id, name, isHiddenForApprover = false) => {
  return {
    id,
    name,
    description: "service description",
    isExternalService: true,
    isMigrated: true,
    isHiddenForApprover,
    relyingParty: {
      service_home: "http://service.one/login",
      redirect_uris: ["http://service.one/login/cb"],
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
      createService("service-1", "1 - Visible service one", false),
      createService("service-2", "2 - Visible service two", false),
      createService("service-3", "3 - Hidden service three", true),
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
    ]);
  });

  it("should exclude a service with isHiddenForApprover: true", async () => {
    const services = [
      createService("service-visible", "Visible Service", false),
      createService("service-hidden", "Hidden Service", true),
    ];
    checkCacheForAllServices.mockResolvedValue({ services });

    await home(req, res);

    const rendered = res.render.mock.calls[0][1].services;
    expect(rendered.map((s) => s.id)).not.toContain("service-hidden");
    expect(rendered.map((s) => s.id)).toContain("service-visible");
  });

  it("should include a service with isHiddenForApprover: false", async () => {
    const services = [createService("service-shown", "Shown Service", false)];
    checkCacheForAllServices.mockResolvedValue({ services });

    await home(req, res);

    const rendered = res.render.mock.calls[0][1].services;
    expect(rendered.map((s) => s.id)).toContain("service-shown");
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
