const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");

jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);
jest.mock("./../../../../src/infrastructure/access", () => {
  return {
    updateUserService: jest.fn(),
    updateInvitationService: jest.fn(),
  };
});
jest.mock("login.dfe.api-client/services", () => {
  return {
    getServiceRolesRaw: jest.fn(),
  };
});
jest.mock("./../../../../src/app/users/utils");
jest.mock("login.dfe.jobs-client");
const { NotificationClient } = require("login.dfe.jobs-client");
const logger = require("./../../../../src/infrastructure/logger");
const {
  getSingleServiceForUser,
  isUserManagement,
} = require("./../../../../src/app/users/utils");
const {
  updateUserService,
  updateInvitationService,
} = require("./../../../../src/infrastructure/access");

const { getServiceRolesRaw } = require("login.dfe.api-client/services");

const sendServiceAdded = jest.fn();

describe("when editing a service for a user", () => {
  let req;
  let res;

  let postConfirmEditService;
  const expectedEmailAddress = "test@test.com";
  const expectedFirstName = "test";
  const expectedLastName = "name";

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
      service: {
        roles: ["role1", "role2"],
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

    getSingleServiceForUser.mockReset();
    getSingleServiceForUser.mockReturnValue({
      id: "service1",
      dateActivated: "10/10/2018",
      name: "service name",
      status: "active",
    });

    getServiceRolesRaw.mockReset();
    getServiceRolesRaw.mockReturnValue([
      {
        code: "role_code",
        id: "role_id",
        name: "role_name",
        status: {
          id: "status_id",
        },
      },
    ]);

    isUserManagement.mockReset();
    isUserManagement.mockReturnValue(true);

    res = mockResponse();
    postConfirmEditService =
      require("./../../../../src/app/users/confirmEditService").post;
    sendServiceAdded.mockReset();
    NotificationClient.mockReset().mockImplementation(() => ({
      sendServiceAdded,
    }));
  });

  it("then it should edit service for invitation if request for invitation", async () => {
    req.params.uid = "inv-invite1";

    await postConfirmEditService(req, res);

    expect(updateInvitationService.mock.calls).toHaveLength(1);
    expect(updateInvitationService.mock.calls[0][0]).toBe("invite1");
    expect(updateInvitationService.mock.calls[0][1]).toBe("service1");
    expect(updateInvitationService.mock.calls[0][2]).toBe("org1");
    expect(updateInvitationService.mock.calls[0][3]).toEqual([
      "role1",
      "role2",
    ]);
    expect(updateInvitationService.mock.calls[0][4]).toBe("correlationId");
  });

  it("then it should edit service for user if request for user", async () => {
    await postConfirmEditService(req, res);

    expect(updateUserService.mock.calls).toHaveLength(1);
    expect(updateUserService.mock.calls[0][0]).toBe("user1");
    expect(updateUserService.mock.calls[0][1]).toBe("service1");
    expect(updateUserService.mock.calls[0][2]).toBe("org1");
    expect(updateUserService.mock.calls[0][3]).toEqual(["role1", "role2"]);
    expect(updateUserService.mock.calls[0][4]).toBe("correlationId");
  });

  it("then it should should audit service being edited", async () => {
    await postConfirmEditService(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      "user.one@unit.test updated service service name for user test@test.com",
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      type: "approver",
      subType: "user-service-updated",
      userId: "user1",
      userEmail: "user.one@unit.test",
      organisationId: "org1",
      meta: {
        editedUser: "user1",
        editedFields: [
          {
            name: "update_service",
            newValue: ["role1", "role2"],
          },
        ],
      },
    });
  });

  it("then it should send an email notification to user when service added", async () => {
    await postConfirmEditService(req, res);

    expect(sendServiceAdded.mock.calls).toHaveLength(1);

    expect(sendServiceAdded.mock.calls[0][0]).toBe(expectedEmailAddress);
    expect(sendServiceAdded.mock.calls[0][1]).toBe(expectedFirstName);
    expect(sendServiceAdded.mock.calls[0][2]).toBe(expectedLastName);
  });

  describe("when we are under manage-users", () => {
    it("then it should redirect to user details", async () => {
      await postConfirmEditService(req, res);

      expect(res.redirect.mock.calls).toHaveLength(1);
      expect(res.redirect.mock.calls[0][0]).toBe(
        `/approvals/users/${req.params.uid}`,
      );
    });

    it("then a flash message is shown to the user", async () => {
      await postConfirmEditService(req, res);

      expect(res.flash.mock.calls).toHaveLength(3);
      expect(res.flash.mock.calls[0][0]).toBe("title");
      expect(res.flash.mock.calls[0][1]).toBe(`Success`);
      expect(res.flash.mock.calls[1][0]).toBe("heading");
      expect(res.flash.mock.calls[1][1]).toBe(`Service amended: service name`);
      expect(res.flash.mock.calls[2][0]).toBe("message");
      expect(res.flash.mock.calls[2][1]).toBe(
        "The user can now access its edited functions and features.",
      );
    });
  });

  describe("when we are under services (self-management for approver)", () => {
    beforeEach(() => {
      isUserManagement.mockReset();
      isUserManagement.mockReturnValue(false);
    });

    it("then it should redirect to services dashboard", async () => {
      await postConfirmEditService(req, res);

      expect(res.redirect.mock.calls).toHaveLength(1);
      expect(res.redirect.mock.calls[0][0]).toBe(`/my-services`);
    });

    it("then a flash message is shown to the user", async () => {
      await postConfirmEditService(req, res);

      expect(res.flash.mock.calls).toHaveLength(3);
      expect(res.flash.mock.calls[0][0]).toBe("title");
      expect(res.flash.mock.calls[0][1]).toBe(`Success`);
      expect(res.flash.mock.calls[1][0]).toBe("heading");
      expect(res.flash.mock.calls[1][1]).toBe(`Service amended: service name`);
      expect(res.flash.mock.calls[2][0]).toBe("message");
      expect(res.flash.mock.calls[2][1]).toBe(
        "Select the service from the list below to access its functions and features.",
      );
    });
  });
});
