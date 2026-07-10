jest.mock("login.dfe.dao", () => ({
  services: {
    getFilteredUserServicesWithOrganisation: jest.fn(),
  },
  organisation: {
    getStatusNameById: jest.fn().mockReturnValue("Open"),
  },
}));

jest.mock("../../../../src/infrastructure/helpers/allServicesAppCache", () => ({
  checkCacheForAllServices: jest.fn(),
}));

jest.mock("../../../../src/app/users/utils", () => ({
  getOrgNaturalIdentifiers: jest.fn().mockReturnValue([]),
  isRemoveService: jest.fn().mockReturnValue(false),
  isOrgEndUser: jest.fn().mockReturnValue(false),
}));

const { services } = require("login.dfe.dao");
const {
  checkCacheForAllServices,
} = require("../../../../src/infrastructure/helpers/allServicesAppCache");
const {
  get,
} = require("../../../../src/app/users/selectServiceWithOrganisation");

const makeServiceOrg = (serviceId, orgStatus = 1) => ({
  id: `record-${serviceId}`,
  Service: { id: serviceId, name: `Service ${serviceId}` },
  Organisation: {
    id: `org-${serviceId}`,
    Status: orgStatus,
    naturalIdentifiers: [],
  },
});

describe("selectServiceWithOrganisation — isHiddenForApprover filtering", () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      user: { sub: "user1" },
      session: {},
      query: {},
      csrfToken: () => "token",
    };

    res = {
      render: jest.fn(),
    };
  });

  it("includes services where isHiddenForApprover is false", async () => {
    services.getFilteredUserServicesWithOrganisation.mockResolvedValue([
      makeServiceOrg("svc-visible"),
    ]);
    checkCacheForAllServices.mockResolvedValue({
      services: [{ id: "svc-visible", isHiddenForApprover: false }],
    });

    await get(req, res);

    const rendered = res.render.mock.calls[0][1];
    expect(rendered.serviceOrganisations).toHaveLength(1);
    expect(rendered.serviceOrganisations[0].Service.id).toBe("svc-visible");
  });

  it("excludes services where isHiddenForApprover is true", async () => {
    services.getFilteredUserServicesWithOrganisation.mockResolvedValue([
      makeServiceOrg("svc-hidden"),
      makeServiceOrg("svc-visible"),
    ]);
    checkCacheForAllServices.mockResolvedValue({
      services: [
        { id: "svc-hidden", isHiddenForApprover: true },
        { id: "svc-visible", isHiddenForApprover: false },
      ],
    });

    await get(req, res);

    const rendered = res.render.mock.calls[0][1];
    expect(rendered.serviceOrganisations).toHaveLength(1);
    expect(rendered.serviceOrganisations[0].Service.id).toBe("svc-visible");
    expect(
      rendered.serviceOrganisations.find(
        (so) => so.Service.id === "svc-hidden",
      ),
    ).toBeUndefined();
  });

  it("includes services when cache returns empty (empty hidden set means nothing is hidden)", async () => {
    services.getFilteredUserServicesWithOrganisation.mockResolvedValue([
      makeServiceOrg("svc-visible"),
    ]);
    // Cache returns empty — no hidden IDs
    checkCacheForAllServices.mockResolvedValue({ services: [] });

    await get(req, res);

    const rendered = res.render.mock.calls[0][1];
    expect(rendered.serviceOrganisations).toHaveLength(1);
  });

  it("handles checkCacheForAllServices returning null/undefined safely", async () => {
    services.getFilteredUserServicesWithOrganisation.mockResolvedValue([
      makeServiceOrg("svc-visible"),
    ]);
    checkCacheForAllServices.mockResolvedValue(null);

    await get(req, res);

    const rendered = res.render.mock.calls[0][1];
    expect(rendered.serviceOrganisations).toHaveLength(1);
  });

  it("still filters out hidden-organisation services regardless of isHiddenForApprover", async () => {
    services.getFilteredUserServicesWithOrganisation.mockResolvedValue([
      makeServiceOrg("svc-active", 1),
      makeServiceOrg("svc-hidden-org", 0),
    ]);
    checkCacheForAllServices.mockResolvedValue({
      services: [
        { id: "svc-active", isHiddenForApprover: false },
        { id: "svc-hidden-org", isHiddenForApprover: false },
      ],
    });

    await get(req, res);

    const rendered = res.render.mock.calls[0][1];
    expect(rendered.serviceOrganisations).toHaveLength(1);
    expect(rendered.serviceOrganisations[0].Service.id).toBe("svc-active");
  });
});
