const {
  mockRequest,
  mockResponse,
  mockLogger,
  mockAdapterConfig,
} = require("./../../../utils/jestMocks");
const Account = require("./../../../../src/infrastructure/account");

const organisations = require("./../../../../src/app/organisations/organisations");

jest.mock("./../../../../src/infrastructure/config", () => mockAdapterConfig());
jest.mock("./../../../../src/infrastructure/logger", () => mockLogger());

jest.mock("./../../../../src/infrastructure/organisations", () => ({
  getOrganisationAndServiceForUser: jest.fn(),
  getPendingRequestsAssociatedWithUser: jest.fn(),
}));

jest.mock("./../../../../src/infrastructure/account", () => ({
  fromContext: jest.fn(),
  getUsersById: jest.fn(),
}));

jest.mock("login.dfe.api-client/services");

const {
  getOrganisationAndServiceForUser,
  getPendingRequestsAssociatedWithUser,
} = require("./../../../../src/infrastructure/organisations");
const {
  getAllRequestTypesForApproverRaw,
} = require("login.dfe.api-client/services");

const makeApprover = (userId, email, status) => ({
  claims: { sub: userId, email, status },
  email,
});

const makeOrg = (orgId, approverIds = []) => ({
  organisation: {
    id: orgId,
    name: `Org ${orgId}`,
    LegalName: null,
    urn: null,
    uid: null,
    upin: null,
    ukprn: null,
    status: { id: 1 },
  },
  role: { id: 0 },
  approvers: approverIds.map((id) => ({ user_id: id })),
});

const res = mockResponse();

describe("organisations controller", () => {
  let req;

  beforeEach(() => {
    req = mockRequest({ user: { sub: "user1" }, organisationRequests: [] });
    res.mockResetAll();

    Account.fromContext.mockReset().mockReturnValue({ id: "user1" });

    getPendingRequestsAssociatedWithUser.mockReset().mockResolvedValue([]);

    getAllRequestTypesForApproverRaw.mockReset().mockResolvedValue({
      totalNumberOfRecords: 0,
    });
  });

  it("excludes deactivated approvers (status 0) from the dropdown", async () => {
    const activeApprover = makeApprover("approver-1", "active@example.com", 1);
    const deactivatedApprover = makeApprover(
      "approver-2",
      "deactivated@example.com",
      0,
    );

    getOrganisationAndServiceForUser.mockResolvedValue([
      makeOrg("org-1", ["approver-1", "approver-2"]),
    ]);

    Account.getUsersById.mockResolvedValue([
      activeApprover,
      deactivatedApprover,
    ]);

    await organisations(req, res);

    const rendered = res.render.mock.calls[0][1];
    const org = rendered.organisations.find((o) => o.id === "org-1");
    expect(org.approvers).toHaveLength(1);
    expect(org.approvers[0].claims.email).toBe("active@example.com");
  });

  it("excludes deactivated-invitation approvers (status -2) from the dropdown", async () => {
    const activeApprover = makeApprover("approver-1", "active@example.com", 1);
    const deactivatedInvite = makeApprover(
      "approver-3",
      "deactivated-invite@example.com",
      -2,
    );

    getOrganisationAndServiceForUser.mockResolvedValue([
      makeOrg("org-1", ["approver-1", "approver-3"]),
    ]);

    Account.getUsersById.mockResolvedValue([activeApprover, deactivatedInvite]);

    await organisations(req, res);

    const rendered = res.render.mock.calls[0][1];
    const org = rendered.organisations.find((o) => o.id === "org-1");
    expect(org.approvers).toHaveLength(1);
    expect(org.approvers[0].claims.email).toBe("active@example.com");
  });

  it("includes active approvers (status 1) in the dropdown", async () => {
    const activeApprover = makeApprover("approver-1", "active@example.com", 1);

    getOrganisationAndServiceForUser.mockResolvedValue([
      makeOrg("org-1", ["approver-1"]),
    ]);

    Account.getUsersById.mockResolvedValue([activeApprover]);

    await organisations(req, res);

    const rendered = res.render.mock.calls[0][1];
    const org = rendered.organisations.find((o) => o.id === "org-1");
    expect(org.approvers).toHaveLength(1);
    expect(org.approvers[0].claims.email).toBe("active@example.com");
  });

  it("returns an empty approvers list when all approvers are deactivated", async () => {
    const deactivated1 = makeApprover("approver-1", "a@example.com", 0);
    const deactivated2 = makeApprover("approver-2", "b@example.com", -2);

    getOrganisationAndServiceForUser.mockResolvedValue([
      makeOrg("org-1", ["approver-1", "approver-2"]),
    ]);

    Account.getUsersById.mockResolvedValue([deactivated1, deactivated2]);

    await organisations(req, res);

    const rendered = res.render.mock.calls[0][1];
    const org = rendered.organisations.find((o) => o.id === "org-1");
    expect(org.approvers).toHaveLength(0);
  });
});
