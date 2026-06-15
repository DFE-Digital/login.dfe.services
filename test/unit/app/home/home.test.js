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

const createFullyHiddenService = (id, name, paramValue = "true") => ({
  id,
  name,
  description: "service description",
  isExternalService: true,
  isMigrated: true,
  isHiddenService: false,
  isIdOnlyService: false,
  relyingParty: {
    service_home: `http://${id}/login`,
    redirect_uris: [`http://${id}/login/cb`],
    params: {
      hideApprover: paramValue,
      hideSupport: paramValue,
      helpHidden: paramValue,
    },
  },
});

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
      // service-4 is hidden: hideApprover alone is sufficient to hide a role-based service
      // (backward-compatible with pre-NSA-9688 behaviour).
      createService("service-4", "4 - Single hideApprover param only", "true"),
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
      createFullyHiddenService("service-6", "6 - Fully hidden string params"),
      createFullyHiddenService(
        "service-7",
        "7 - Fully hidden integer params",
        1,
      ),
    ];
    checkCacheForAllServices.mockResolvedValue({
      services,
    });

    await home(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][1].services).toBeDefined();
    // service-4 is hidden: hideApprover=true alone hides a role-based service.
    // service-5 is hidden: id-only service with isHiddenService=true is always hidden.
    // service-6 and service-7 are hidden: all three params are truthy (string and integer).
    expect(res.render.mock.calls[0][1].services).toEqual([
      services[0],
      services[1],
      services[2],
    ]);
  });

  it("should keep a service visible when all three params are false (after unhide)", async () => {
    const services = [
      {
        id: "service-unhidden",
        name: "Unhidden Service",
        description: "service description",
        isExternalService: true,
        isMigrated: true,
        isHiddenService: false,
        isIdOnlyService: false,
        relyingParty: {
          params: {
            hideApprover: false,
            hideSupport: false,
            helpHidden: false,
          },
        },
      },
    ];
    checkCacheForAllServices.mockResolvedValue({ services });

    await home(req, res);

    expect(res.render.mock.calls[0][1].services).toHaveLength(1);
    expect(res.render.mock.calls[0][1].services[0].id).toBe("service-unhidden");
  });

  it("should hide a service when all three params are integer 1", async () => {
    checkCacheForAllServices.mockResolvedValue({
      services: [createFullyHiddenService("svc-int", "Integer Hidden", 1)],
    });

    await home(req, res);

    expect(res.render.mock.calls[0][1].services).toHaveLength(0);
  });

  it("should hide a service when all three params are boolean true", async () => {
    checkCacheForAllServices.mockResolvedValue({
      services: [createFullyHiddenService("svc-bool", "Boolean Hidden", true)],
    });

    await home(req, res);

    expect(res.render.mock.calls[0][1].services).toHaveLength(0);
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
