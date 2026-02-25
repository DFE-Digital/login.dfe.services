const {
  mockRequest,
  mockResponse,
  mockAdapterConfig,
} = require("./../../../utils/jestMocks");
const {
  checkCacheForAllServices,
} = require("./../../../../src/infrastructure/helpers/allServicesAppCache");

jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);

jest.mock("login.dfe.api-client/invitations", () => {
  return { deleteServiceAccessFromInvitation: jest.fn() };
});
jest.mock("login.dfe.api-client/users", () => {
  return {
    deleteUserServiceAccess: jest.fn(),
    searchUserByIdRaw: jest.fn(),
    updateUserDetailsInSearchIndex: jest.fn(),
  };
});

jest.mock(
  "./../../../../src/infrastructure/helpers/allServicesAppCache",
  () => {
    return {
      checkCacheForAllServices: jest.fn(),
    };
  },
);
jest.mock("./../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});
jest.mock("login.dfe.dao", () => {
  return {
    services: {
      list: async () => {
        return {
          count: 10,
          rows: [
            {
              id: "service1",
              isExternalService: true,
              isMigrated: true,
              name: "Service One",
            },
            {
              id: "service2",
              isExternalService: true,
              isMigrated: true,
              name: "Service two",
            },
          ],
        };
      },
    },
  };
});

jest.mock("./../../../../src/app/users/utils");

jest.mock("login.dfe.jobs-client");
const logger = require("./../../../../src/infrastructure/logger");
const {
  getUserDetails,
  getSingleServiceForUser,
  isUserManagement,
} = require("./../../../../src/app/users/utils");

const {
  deleteServiceAccessFromInvitation,
} = require("login.dfe.api-client/invitations");

const {
  deleteUserServiceAccess,
  searchUserByIdRaw,
} = require("login.dfe.api-client/users");

describe("when removing service access", () => {
  let req;
  let res;

  let postRemoveServiceAccess;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: "user1",
      orgId: "org1",
      sid: "service1",
    };
    req.session = {
      user: {
        email: "test@test.com",
        firstName: "test",
        lastName: "name",
      },
    };
    req.user = {
      sub: "user1",
      email: "user.one@unit.test",
      organisations: [
        {
          organisation: {
            id: "organisationId",
            name: "organisationName",
          },
          role: {
            id: 0,
            name: "category name",
          },
        },
      ],
    };
    req.userOrganisations = [
      {
        organisation: {
          id: "org1",
          name: "organisationName",
        },
        role: {
          id: 0,
          name: "category name",
        },
      },
    ];
    req.body = {
      selectedOrganisation: "organisationId",
    };

    getUserDetails.mockReset();
    getUserDetails.mockReturnValue({
      id: "user1",
      email: "email@email.com",
    });

    getSingleServiceForUser.mockReset();
    getSingleServiceForUser.mockReturnValue({
      id: "service1",
      dateActivated: "10/10/2018",
      name: "service name",
      status: "active",
    });

    searchUserByIdRaw.mockReset();
    searchUserByIdRaw.mockReturnValue({
      organisations: [
        {
          id: "org1",
          name: "organisationName",
          categoryId: "004",
          statusId: 1,
          roleId: 0,
        },
      ],
      services: [],
    });

    checkCacheForAllServices.mockReset();
    checkCacheForAllServices.mockReturnValue({
      services: [
        {
          id: "service1",
          name: "service name",
        },
      ],
    });

    isUserManagement.mockReset();
    isUserManagement.mockReturnValue(true);

    res = mockResponse();
    postRemoveServiceAccess =
      require("./../../../../src/app/users/removeServiceAccess").post;
  });

  it("should redirect if there is no user in the session", async () => {
    req = mockRequest({
      params: {
        uid: "user1",
        orgId: "org1",
        sid: "service1",
      },
    });
    await postRemoveServiceAccess(req, res);

    expect(res.redirect.mock.calls.length).toBe(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/approvals/users/user1");
  });

  it("then it should delete service for invitation if request for invitation", async () => {
    req.params.uid = "inv-invite1";

    await postRemoveServiceAccess(req, res);

    expect(deleteServiceAccessFromInvitation.mock.calls).toHaveLength(1);
    expect(deleteServiceAccessFromInvitation).toHaveBeenCalledWith({
      invitationId: "invite1",
      serviceId: "service1",
      organisationId: "org1",
    });
  });

  it("then it should delete org for user if request for user", async () => {
    await postRemoveServiceAccess(req, res);

    expect(deleteUserServiceAccess.mock.calls).toHaveLength(1);
    expect(deleteUserServiceAccess).toHaveBeenCalledWith({
      userId: "user1",
      serviceId: "service1",
      organisationId: "org1",
    });
  });

  it("then it should should audit service being removed", async () => {
    await postRemoveServiceAccess(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      "user.one@unit.test removed service service name for user test@test.com",
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      type: "approver",
      subType: "user-service-deleted",
      userId: "user1",
      userEmail: "user.one@unit.test",
      organisationId: "org1",
      meta: {
        editedUser: "user1",
        editedFields: [
          {
            name: "remove_service",
            oldValue: "service1",
            newValue: undefined,
          },
        ],
      },
    });
  });

  describe("when we are under manage-users", () => {
    it("then it should redirect to user details", async () => {
      await postRemoveServiceAccess(req, res);

      expect(res.redirect.mock.calls).toHaveLength(1);
      expect(res.redirect.mock.calls[0][0]).toBe(
        `/approvals/users/${req.params.uid}`,
      );
    });

    it("then a flash message is shown to the user", async () => {
      await postRemoveServiceAccess(req, res);

      expect(res.flash.mock.calls).toHaveLength(3);
      expect(res.flash.mock.calls[0][0]).toBe("title");
      expect(res.flash.mock.calls[0][1]).toBe("Success");
      expect(res.flash.mock.calls[1][0]).toBe("heading");
      expect(res.flash.mock.calls[1][1]).toBe("Service removed: service name");
      expect(res.flash.mock.calls[2][0]).toBe("message");
      expect(res.flash.mock.calls[2][1]).toBe(
        "This service (and its associated roles) has been removed from this user's account.",
      );
    });
  });

  describe("when we are under services (self-management for approver)", () => {
    beforeEach(() => {
      isUserManagement.mockReset();
      isUserManagement.mockReturnValue(false);
    });

    it("then it should redirect to services dashboard", async () => {
      await postRemoveServiceAccess(req, res);

      expect(res.redirect.mock.calls).toHaveLength(1);
      expect(res.redirect.mock.calls[0][0]).toBe(`/my-services`);
    });

    it("then a flash message is shown to the user", async () => {
      await postRemoveServiceAccess(req, res);

      expect(res.flash.mock.calls).toHaveLength(3);
      expect(res.flash.mock.calls[0][0]).toBe("title");
      expect(res.flash.mock.calls[0][1]).toBe("Success");
      expect(res.flash.mock.calls[1][0]).toBe("heading");
      expect(res.flash.mock.calls[1][1]).toBe("Service removed: service name");
      expect(res.flash.mock.calls[2][0]).toBe("message");
      expect(res.flash.mock.calls[2][1]).toBe(
        "This service (and its associated roles) has been removed from your account.",
      );
    });
  });
});
