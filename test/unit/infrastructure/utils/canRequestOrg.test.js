jest.mock("../../../../src/infrastructure/config", () => mockConfig());
jest.mock("../../../../src/infrastructure/organisations");

const {
  mockConfig,
  mockRequest,
  mockResponse,
} = require("../../../utils/jestMocks");
const {
  getPendingRequestsAssociatedWithUser,
} = require("../../../../src/infrastructure/organisations");
const { canRequestOrg } = require("../../../../src/infrastructure/utils");

function createOrg(id) {
  return {
    organisation: {
      id: `testOrgId${id}`,
      name: "testOrgName",
      urn: "testOrgURN",
      uid: "testOrgUID",
      upin: "testOrgUPIN",
      ukprn: "testOrgUKPRN",
      address: undefined,
      status: {
        id: 1,
        name: "Open",
      },
      pimStatus: "1",
      legacyUserId: undefined,
      legacyUserName: undefined,
      category: {
        id: "002",
        name: "Local Authority",
      },
      type: undefined,
      providerTypeName: "Local Authority with an Education remit",
      companyRegistrationNumber: undefined,
      LegalName: "testOrgLegalName",
    },
    role: {
      id: 0,
      name: "End user",
    },
    approvers: [],
    services: [],
    numericIdentifier: undefined,
    textIdentifier: undefined,
  };
}

function createRequest(id) {
  return {
    id: `testRequestId${id}`,
    org_id: "testOrgId",
    org_name: "testOrgName",
    LegalName: "testOrgLegalName",
    urn: "testOrgURN",
    uid: "testOrgUID",
    upin: "testOrgUPIN",
    ukprn: "testOrgUKPRN",
    org_status: {
      id: 1,
      name: "Open",
    },
    user_id: "user-1",
    created_date: Date.now(),
    status: {
      id: 0,
      name: "Pending",
    },
  };
}

describe("When using the canRequestOrg middleware", () => {
  const testUserId = "user-1";
  const res = mockResponse();
  let req;

  const singleOrg = [createOrg(1)];
  const multipleOrgs = [createOrg(1), createOrg(2)];
  const singleRequest = [createRequest(1)];
  const multipleRequests = [createRequest(1), createRequest(2)];

  beforeEach(() => {
    req = mockRequest({
      user: {
        id: testUserId,
      },
      userOrganisations: [],
    });
    res.mockResetAll();
    getPendingRequestsAssociatedWithUser.mockResolvedValue([]);
  });

  afterEach(() => {
    getPendingRequestsAssociatedWithUser.mockReset();
  });

  it("it checks if the user has any pending organisation requests", async () => {
    await canRequestOrg(req, res, () => {});

    expect(getPendingRequestsAssociatedWithUser).toHaveBeenCalled();
    expect(getPendingRequestsAssociatedWithUser).toHaveBeenCalledWith(
      testUserId,
    );
  });

  it.each([
    {
      requests: singleRequest,
      requestMessage: "1 pending request",
    },
    {
      requests: multipleRequests,
      requestMessage: "multiple pending requests",
    },
  ])(
    "it sets an appropriate flash message if the user has 0 orgs and $requestMessage",
    async ({ requests }) => {
      req.userOrganisations = [];
      getPendingRequestsAssociatedWithUser.mockResolvedValue(requests);
      await canRequestOrg(req, res, () => {});

      expect(res.flash).toHaveBeenCalledTimes(3);
      expect(res.flash).toHaveBeenCalledWith("title", "Important");
      expect(res.flash).toHaveBeenCalledWith(
        "heading",
        "Your recent organisation request is awaiting approval.",
      );
      expect(res.flash).toHaveBeenCalledWith(
        "message",
        "You must wait for a response before submitting another request.",
      );
    },
  );

  it.each([
    {
      requests: singleRequest,
      requestMessage: "1 pending request",
    },
    {
      requests: multipleRequests,
      requestMessage: "multiple pending requests",
    },
  ])(
    "it redirects to the /organisations page if the user has 0 orgs and $requestMessage",
    async ({ requests }) => {
      req.userOrganisations = [];
      getPendingRequestsAssociatedWithUser.mockResolvedValue(requests);
      await canRequestOrg(req, res, () => {});

      expect(res.sessionRedirect).toHaveBeenCalled();
      expect(res.sessionRedirect).toHaveBeenCalledWith("/organisations");
    },
  );

  it.each([
    {
      orgs: [],
      requests: [],
      orgMessage: "0 orgs",
      requestMessage: "0 pending requests",
    },
    {
      orgs: singleOrg,
      requests: [],
      orgMessage: "1 org",
      requestMessage: "0 pending requests",
    },
    {
      orgs: singleOrg,
      requests: singleRequest,
      orgMessage: "1 org",
      requestMessage: "1 pending request",
    },
    {
      orgs: singleOrg,
      requests: multipleRequests,
      orgMessage: "1 org",
      requestMessage: "multiple pending requests",
    },
    {
      orgs: multipleOrgs,
      requests: [],
      orgMessage: "multiple orgs",
      requestMessage: "0 pending requests",
    },
    {
      orgs: multipleOrgs,
      requests: singleRequest,
      orgMessage: "multiple orgs",
      requestMessage: "1 pending request",
    },
    {
      orgs: multipleOrgs,
      requests: multipleRequests,
      orgMessage: "multiple orgs",
      requestMessage: "multiple pending requests",
    },
  ])(
    "it runs the next middleware in the stack if the user has $orgMessage and $requestMessage",
    async ({ orgs, requests }) => {
      const next = jest.fn();
      req.userOrganisations = orgs;
      getPendingRequestsAssociatedWithUser.mockResolvedValue(requests);
      await canRequestOrg(req, res, next);

      expect(next).toHaveBeenCalled();
    },
  );
});
