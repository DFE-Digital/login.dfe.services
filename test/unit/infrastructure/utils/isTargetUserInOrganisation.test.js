jest.mock("../../../../src/infrastructure/config", () => mockConfig());
jest.mock("../../../../src/infrastructure/organisations");

const {
  mockConfig,
  mockRequest,
  mockResponse,
} = require("../../../utils/jestMocks");
const {
  getOrganisationAndServiceForUser,
  getOrganisationAndServiceForInvitation,
} = require("../../../../src/infrastructure/organisations");
const {
  isTargetUserInOrganisation,
} = require("../../../../src/infrastructure/utils");

const membershipOf = (...orgIds) =>
  orgIds.map((id) => ({ organisation: { id }, role: { id: 0 }, services: [] }));

describe("isTargetUserInOrganisation", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = mockRequest({
      params: { orgId: "org-a", uid: "user-1" },
    });
    res = mockResponse();
    res.mockResetAll();
    next = jest.fn();
    getOrganisationAndServiceForUser.mockReset();
    getOrganisationAndServiceForInvitation.mockReset();
  });

  it("calls next when the user is a member of the organisation", async () => {
    getOrganisationAndServiceForUser.mockResolvedValue(
      membershipOf("org-b", "org-a"),
    );

    await isTargetUserInOrganisation(req, res, next);

    expect(getOrganisationAndServiceForUser).toHaveBeenCalledWith("user-1");
    expect(getOrganisationAndServiceForInvitation).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
    expect(res.render).not.toHaveBeenCalled();
  });

  it("matches the organisation id case-insensitively", async () => {
    req.params.orgId = "ORG-A";
    getOrganisationAndServiceForUser.mockResolvedValue(membershipOf("org-a"));

    await isTargetUserInOrganisation(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("returns 401 when the user is not a member of the organisation", async () => {
    getOrganisationAndServiceForUser.mockResolvedValue(membershipOf("org-b"));

    await isTargetUserInOrganisation(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.render).toHaveBeenCalledWith("errors/views/notAuthorised");
  });

  it("returns 401 when the user has no organisations", async () => {
    getOrganisationAndServiceForUser.mockResolvedValue([]);

    await isTargetUserInOrganisation(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 401 when the organisation lookup returns nothing", async () => {
    getOrganisationAndServiceForUser.mockResolvedValue(undefined);

    await isTargetUserInOrganisation(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("looks up invitations by id without the inv- prefix and allows members", async () => {
    req.params.uid = "inv-invitation-1";
    getOrganisationAndServiceForInvitation.mockResolvedValue(
      membershipOf("org-a"),
    );

    await isTargetUserInOrganisation(req, res, next);

    expect(getOrganisationAndServiceForInvitation).toHaveBeenCalledWith(
      "invitation-1",
    );
    expect(getOrganisationAndServiceForUser).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it("returns 401 when the invitation does not belong to the organisation", async () => {
    req.params.uid = "inv-invitation-1";
    getOrganisationAndServiceForInvitation.mockResolvedValue(
      membershipOf("org-b"),
    );

    await isTargetUserInOrganisation(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.render).toHaveBeenCalledWith("errors/views/notAuthorised");
  });

  it("returns 401 without a lookup when uid is missing", async () => {
    req.params = { orgId: "org-a" };

    await isTargetUserInOrganisation(req, res, next);

    expect(getOrganisationAndServiceForUser).not.toHaveBeenCalled();
    expect(getOrganisationAndServiceForInvitation).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("passes lookup errors to next and does not render", async () => {
    const error = new Error("lookup failed");
    getOrganisationAndServiceForUser.mockRejectedValue(error);

    await isTargetUserInOrganisation(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.render).not.toHaveBeenCalled();
  });
});
