jest.mock("login.dfe.dao", () =>
  require("./../../../utils/jestMocks").mockDao(),
);

const { mockRequest } = require("../../../utils/jestMocks");

const {
  getOrgNaturalIdentifiers,
  isEditService,
  isLoginOver24,
  isOrgEndUser,
  isRequestServiceInSession,
  isUserApprover,
} = require("../../../../src/app/users/utils");
const { actions } = require("../../../../src/app/constants/actions");

describe("users/utils functions", () => {
  it(`isRequestServiceInSession - should return true if action in session is '${actions.REQUEST_SERVICE}'`, () => {
    const req = mockRequest({
      session: {
        action: actions.REQUEST_SERVICE,
      },
    });

    const result = isRequestServiceInSession(req);
    expect(result).toBe(true);
  });

  it(`isRequestServiceInSession - should return true action in query is '${actions.EDIT_SERVICE}'`, () => {
    const req = mockRequest({
      query: {
        action: actions.EDIT_SERVICE,
      },
    });

    const result = isEditService(req);
    expect(result).toBe(true);
  });

  it("isUserApprover - should return true if approvers (10000) in userOrganisations", () => {
    const req = mockRequest({
      userOrganisations: [{ role: { id: 10000 } }],
    });

    const result = isUserApprover(req);
    expect(result).toBe(true);
  });

  it("isUserApprover - should return false if no approvers (0) in userOrganisations", () => {
    const req = mockRequest({
      userOrganisations: [{ role: { id: 0 } }],
    });

    const result = isUserApprover(req);
    expect(result).toBe(false);
  });

  it("isUserApprover - should return false if no userOrganisations in request", () => {
    const req = mockRequest();

    const result = isUserApprover(req);
    expect(result).toBe(false);
  });

  it("isOrgEndUser - should return false if no userOrganisations in request", () => {
    const orgs = undefined;

    const result = isOrgEndUser(orgs, "org-1");
    expect(result).toBe(false);
  });

  it("isOrgEndUser - should return true if organisation and end user role (0) are present", () => {
    const orgs = [
      {
        organisation: {
          id: "org-1",
        },
        role: { id: 0 },
      },
    ];

    const result = isOrgEndUser(orgs, "org-1");
    expect(result).toBe(true);
  });

  describe("getOrgNaturalIdentifiers function", () => {
    it("should return identifiers if present (capitalised field names)", () => {
      const org = {
        URN: "123456",
        UID: "org-1",
        UKPRN: "12345678",
        UPIN: "111222",
      };

      const result = getOrgNaturalIdentifiers(org);
      expect(result).toStrictEqual([
        "URN: 123456",
        "UID: org-1",
        "UKPRN: 12345678",
        "UPIN: 111222",
      ]);
    });

    it("should return identifiers if present (lower case field names)", () => {
      const org = {
        urn: "123456",
        uid: "org-1",
        ukprn: "12345678",
        upin: "111222",
      };

      const result = getOrgNaturalIdentifiers(org);
      expect(result).toStrictEqual([
        "URN: 123456",
        "UID: org-1",
        "UKPRN: 12345678",
        "UPIN: 111222",
      ]);
    });
  });

  describe("isLoginOver24 function", () => {
    it("should return true if 'last_login' is more than 24 hours in the future", () => {
      const last_login = "2026-02-18T11:22:19.790Z";
      const previous_login = "2026-02-16T03:04:19.790Z";

      const formattedDate = isLoginOver24(last_login, previous_login);
      expect(formattedDate).toBe(true);
    });

    it("should return false if 'last_login' is in the past", () => {
      const last_login = "2026-02-10T10:57:19.790Z";
      const previous_login = "2026-02-18T10:57:19.790Z";

      const formattedDate = isLoginOver24(last_login, previous_login);
      expect(formattedDate).toBe(false);
    });

    it("should return false if 'last_login' is less than 24 hours in the future", () => {
      const last_login = "2026-02-18T12:57:19.790Z";
      const previous_login = "2026-02-18T10:57:19.790Z";

      const formattedDate = isLoginOver24(last_login, previous_login);
      expect(formattedDate).toBe(false);
    });

    it("should return false if 'last_login' is exactly 24 hours in the future", () => {
      const last_login = "2026-02-19T10:57:19.790Z";
      const previous_login = "2026-02-18T10:57:19.790Z";

      const formattedDate = isLoginOver24(last_login, previous_login);
      expect(formattedDate).toBe(false);
    });
  });
});
