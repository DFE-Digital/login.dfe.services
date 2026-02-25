jest.mock("login.dfe.dao", () =>
  require("./../../../utils/jestMocks").mockDao(),
);

const { mockRequest } = require("../../../utils/jestMocks");
jest.mock("login.dfe.api-client/users");
jest.mock("login.dfe.api-client/services");

const {
  searchUserByIdRaw,
  getUserServicesRaw,
  getUserServiceRaw,
} = require("login.dfe.api-client/users");

const { getServiceRaw } = require("login.dfe.api-client/services");

const {
  getAllServicesForUserInOrg,
  getOrgNaturalIdentifiers,
  getSingleServiceForUser,
  getUserDetails,
  isEditService,
  isLoginOver24,
  isMultipleRolesAllowed,
  isOrgEndUser,
  isRequestServiceInSession,
  isUserApprover,
  roleSelectionConstraintCheck: roleSelectionConstraintCheck,
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

  describe("getAllServicesForUserInOrg function", () => {
    const userId = "user-1";
    const organisationId = "org-1";

    const service = {
      id: "service-1",
      name: "Service One",
      relyingParty: {
        service_home: "http://service.one/login",
        redirect_uris: ["http://service.one/login/cb"],
      },
    };

    beforeEach(() => {
      getUserServicesRaw.mockReset();
      getUserServicesRaw.mockReturnValue([
        {
          serviceId: "service-1",
          organisationId: "org-1",
          accessGrantedOn: "2024-08-14T11:07:02Z",
        },
      ]);

      getServiceRaw.mockReset();
      getServiceRaw.mockReturnValue(service);
    });

    it("should return an empty array if no services present", async () => {
      getUserServicesRaw.mockReturnValue(undefined);

      const result = await getAllServicesForUserInOrg(userId, organisationId);
      expect(result).toStrictEqual([]);
    });

    it("should user services if given a user id", async () => {
      const result = await getAllServicesForUserInOrg(userId, organisationId);
      expect(result).toStrictEqual([
        {
          dateActivated: "2024-08-14T11:07:02Z",
          id: "service-1",
          name: "Service One",
          status: {
            changedOn: null,
            description: "Unknown",
            id: null,
            tagColor: "grey",
          },
        },
      ]);
    });
  });

  describe("getSingleServiceForUser function", () => {
    const userId = "user-1";
    const organisationId = "org-1";
    const serviceId = "service-1";

    const service = {
      id: "service-1",
      name: "Service One",
      relyingParty: {
        service_home: "http://service.one/login",
        redirect_uris: ["http://service.one/login/cb"],
      },
    };

    beforeEach(() => {
      getUserServiceRaw.mockReset();
      getUserServiceRaw.mockReturnValue({
        serviceId: "service-1",
        organisationId: "org-1",
        accessGrantedOn: "2024-08-14T11:07:02Z",
      });

      getServiceRaw.mockReset();
      getServiceRaw.mockReturnValue(service);
    });

    it("should user services if given a user id", async () => {
      const result = await getSingleServiceForUser(
        userId,
        organisationId,
        serviceId,
      );
      expect(result).toStrictEqual({
        id: "service-1",
        name: "Service One",
        roles: undefined,
      });
    });
  });

  describe("getUserDetails function", () => {
    it("should return user with org data if org matches", async () => {
      searchUserByIdRaw.mockReset();
      searchUserByIdRaw.mockReturnValue({
        firstName: "Test",
        lastName: "User",
        email: "Test.User@example.com",
        lastLogin: "",
        statusId: 1,
        organisations: [
          {
            id: "org-1",
            name: "organisationId",
            categoryId: "004",
            statusId: 1,
            roleId: 0,
          },
        ],
        services: [],
      });
      const req = mockRequest({
        params: {
          uid: "user-1",
          orgId: "org-1",
        },
      });

      const result = await getUserDetails(req);
      expect(result).toStrictEqual({
        id: "user-1",
        firstName: "Test",
        lastName: "User",
        email: "Test.User@example.com",
        status: {
          changedOn: null,
          description: "Active",
          id: 1,
          tagColor: "green",
        },
        organisation: {
          id: "org-1",
          name: "organisationId",
          categoryId: "004",
          statusId: 1,
          roleId: 0,
        },
        lastLogin: "",
        deactivated: false,
      });
    });
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

  describe("isMultipleRolesAllowed function", () => {
    it("should return false if numberOfRolesAvailable is 1 or 0", () => {
      const serviceDetails = {};
      let result;

      result = isMultipleRolesAllowed(serviceDetails, 1);
      expect(result).toBe(false);

      result = isMultipleRolesAllowed(serviceDetails, 0);
      expect(result).toBe(false);
    });

    // result, maximumRolesAllowed, minimumRolesAllowed
    const testCases = [
      [true, 2, 3],
      [false, 0, 1],
      [false, 1, undefined],
      [false, 1, 0],
      [true, undefined, undefined],
      [true, undefined, 2],
    ];

    it.each(testCases)(
      "should return %s if maximumRolesAllowed is %s and minimumRolesRequired is %s",
      (expected, maximumRolesAllowed, minimumRolesRequired) => {
        const serviceDetails = {
          relyingParty: {
            params: {
              minimumRolesRequired,
              maximumRolesAllowed,
            },
          },
        };

        const result = isMultipleRolesAllowed(serviceDetails, 2);
        expect(result).toBe(expected);
      },
    );
  });

  describe("roleSelectionConstraintCheck function", () => {
    it("should return true if 2 roles match", () => {
      const serviceRoles = [
        { id: "role-1" },
        { id: "role-2" },
        { id: "role-3" },
      ];
      const roleSelectionConstraint = "role-1,role-3";

      const result = roleSelectionConstraintCheck(
        serviceRoles,
        roleSelectionConstraint,
      );
      expect(result).toBe(true);
    });

    it("should return false if 1 role matches", () => {
      const serviceRoles = [
        { id: "role-1" },
        { id: "role-2" },
        { id: "role-3" },
      ];
      const roleSelectionConstraint = "role-1";

      const result = roleSelectionConstraintCheck(
        serviceRoles,
        roleSelectionConstraint,
      );
      expect(result).toBe(false);
    });

    it("should return false if an exception happens while running function", () => {
      const serviceRoles = [];
      const roleSelectionConstraint = {}; // Not being a string should trigger exception

      const result = roleSelectionConstraintCheck(
        serviceRoles,
        roleSelectionConstraint,
      );
      expect(result).toBe(false);
    });
  });
});
