const {
  mockRequest,
  mockResponse,
  mockLogger,
  mockAdapterConfig,
} = require("./../../../utils/jestMocks");
jest.mock("./../../../../src/infrastructure/logger", () => mockLogger());
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
jest.mock("login.dfe.api-client/invitations", () => {
  return {
    addServiceToInvitation: jest.fn(),
  };
});
jest.mock("login.dfe.api-client/users", () => {
  return {
    addServiceToUser: jest.fn(),
  };
});
jest.mock("login.dfe.api-client/services", () => {
  return {
    getServiceRolesRaw: jest.fn(),
  };
});
jest.mock("./../../../../src/infrastructure/organisations", () => {
  return {
    putUserInOrganisation: jest.fn(),
    putInvitationInOrganisation: jest.fn(),
    getOrganisationById: jest.fn(),
    getPendingRequestsAssociatedWithUser: jest.fn(),
    getOrganisationAndServiceForInvitation: jest.fn(),
    getOrganisationAndServiceForUser: jest.fn(),
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

jest.mock("./../../../../src/infrastructure/account", () => ({
  createInvite: jest.fn(),
}));

jest.mock("login.dfe.api-client/users", () => {
  return {
    searchUserByIdRaw: jest.fn(),
    updateUserDetailsInSearchIndex: jest.fn(),
    updateUserInSearchIndex: jest.fn(),
    addServiceToUser: jest.fn(),
  };
});

jest.mock("./../../../../src/app/users/utils");

jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);

const { addServiceToInvitation } = require("login.dfe.api-client/invitations");
const { getServiceRolesRaw } = require("login.dfe.api-client/services");
const {
  putUserInOrganisation,
  putInvitationInOrganisation,
  getOrganisationById,
  getPendingRequestsAssociatedWithUser,
  getOrganisationAndServiceForInvitation,
  getOrganisationAndServiceForUser,
} = require("./../../../../src/infrastructure/organisations");
const {
  checkCacheForAllServices,
} = require("./../../../../src/infrastructure/helpers/allServicesAppCache");
const Account = require("./../../../../src/infrastructure/account");
const logger = require("./../../../../src/infrastructure/logger");

jest.mock("login.dfe.jobs-client");
const { NotificationClient } = require("login.dfe.jobs-client");
const {
  searchUserByIdRaw,
  updateUserDetailsInSearchIndex,
  updateUserInSearchIndex,
  addServiceToUser,
} = require("login.dfe.api-client/users");
const sendUserAddedToOrganisationStub = jest.fn();
const sendServiceAddedStub = jest.fn();
const sendServiceRequestApprovedStub = jest.fn();

describe("when inviting a new user", () => {
  let req;
  let res;

  let postConfirmNewUser;
  const expectedOrgName = "organisationName";
  const expectedEmailAddress = "test@test.com";
  const expectedFirstName = "test";
  const expectedLastName = "name";
  const expectedServiceName = "Service One";
  const expectedRoles = [];
  const expectedPermission = {
    id: 0,
    name: "End user",
  };

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      orgId: "org1",
      uid: "user1",
    };
    req.session = {
      user: {
        email: "test@test.com",
        firstName: "test",
        lastName: "name",
        permission: 0,
        services: [
          {
            serviceId: "service1",
            roles: [],
          },
        ],
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
    getPendingRequestsAssociatedWithUser.mockReset();
    getPendingRequestsAssociatedWithUser.mockReturnValue([
      {
        id: "requestId",
        org_id: "organisationId",
        org_name: "organisationName",
        user_id: "user2",
        status: {
          id: 0,
          name: "pending",
        },
        created_date: "2019-08-12",
      },
    ]);
    getOrganisationAndServiceForUser.mockReset().mockReturnValue([
      {
        organisation: {
          id: "org2",
          name: "Great Big School",
        },
        role: {
          id: 0,
          name: "End user",
        },
      },
    ]);
    checkCacheForAllServices.mockReset().mockReturnValue({
      services: [
        {
          id: "service1",
          name: "Service One",
        },
      ],
    });
    getOrganisationAndServiceForInvitation.mockReset().mockReturnValue([
      {
        invitationId: "E89DF8C6-BED4-480D-9F02-34D177E86DAD",
        organisation: {
          id: "org2",
          name: "Great Big School",
        },
        role: {
          id: 0,
          name: "End user",
        },
      },
    ]);
    res = mockResponse();

    Account.createInvite.mockReset();
    Account.createInvite.mockReturnValue("invite1");

    putInvitationInOrganisation.mockReset();
    putUserInOrganisation.mockReset();
    addServiceToInvitation.mockReset();
    addServiceToUser.mockReset();
    updateUserInSearchIndex.mockReset();
    updateUserInSearchIndex.mockReset();
    getOrganisationById.mockReset().mockReturnValue({
      id: "org2",
      name: "organisation two",
      category: {
        id: "001",
        name: "Establishment",
      },
      urn: "12345",
      uid: null,
      ukprn: null,
      establishmentNumber: "9876",
      status: {
        id: 1,
        name: "Open",
      },
      closedOn: null,
      address: null,
      telephone: null,
      localAuthority: {
        id: "la1",
        name: "local authority 1",
        code: "456",
      },
      statutoryLowAge: null,
      statutoryHighAge: null,
      legacyId: "789654",
      companyRegistrationNumber: null,
    });

    searchUserByIdRaw.mockReset();
    searchUserByIdRaw.mockReturnValue({
      organisations: [
        {
          id: "org1",
          name: "organisationId",
          categoryId: "004",
          statusId: 1,
          roleId: 0,
        },
      ],
      services: [],
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
    postConfirmNewUser =
      require("./../../../../src/app/users/confirmNewUser").post;
    sendUserAddedToOrganisationStub.mockReset();
    sendServiceAddedStub.mockReset();
    sendServiceRequestApprovedStub.mockReset();

    NotificationClient.mockReset().mockImplementation(() => ({
      sendUserAddedToOrganisation: sendUserAddedToOrganisationStub,
      sendServiceAdded: sendServiceAddedStub,
      sendServiceRequestApproved: sendServiceRequestApprovedStub,
    }));
  });

  it("then it should redirect to users list if no user in session", async () => {
    req.session.user = null;
    await postConfirmNewUser(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/approvals/users");
    expect(Account.createInvite.mock.calls).toHaveLength(0);
  });

  it("then it should create an invite if no uid exists in params", async () => {
    req.params.uid = null;
    await postConfirmNewUser(req, res);
    expect(Account.createInvite.mock.calls).toHaveLength(1);
    expect(Account.createInvite.mock.calls[0][0]).toBe("test");
    expect(Account.createInvite.mock.calls[0][1]).toBe("name");
    expect(Account.createInvite.mock.calls[0][2]).toBe("test@test.com");
  });

  it("then it should add invitation to organisation", async () => {
    req.params.uid = "inv-invite1";
    req.session.user.isInvite = true;
    await postConfirmNewUser(req, res);

    expect(putInvitationInOrganisation.mock.calls).toHaveLength(1);
    expect(putInvitationInOrganisation.mock.calls[0][0]).toBe("invite1");
    expect(putInvitationInOrganisation.mock.calls[0][1]).toBe("org1");
    expect(putInvitationInOrganisation.mock.calls[0][2]).toBe(0);
  });

  it("then it should add services to invitation for organisation", async () => {
    req.params.uid = "inv-invite1";
    await postConfirmNewUser(req, res);
    expect(addServiceToInvitation).toHaveBeenCalledTimes(1);
    expect(addServiceToInvitation).toHaveBeenCalledWith({
      invitationId: "invite1",
      serviceId: "service1",
      organisationId: "org1",
      serviceRoleIds: [],
    });
  });

  it("then it should add user to organisation if through invite journey", async () => {
    req.params.uid = "user1";
    req.session.user.isInvite = true;
    await postConfirmNewUser(req, res);

    expect(putUserInOrganisation.mock.calls).toHaveLength(1);
    expect(putUserInOrganisation.mock.calls[0][0]).toBe("user1");
    expect(putUserInOrganisation.mock.calls[0][1]).toBe("org1");
    expect(putUserInOrganisation.mock.calls[0][2]).toBe(0);
    expect(putUserInOrganisation.mock.calls[0][3]).toBe(0);
    expect(putUserInOrganisation.mock.calls[0][4]).toBe("correlationId");
  });

  it("then it should not attempt to add user to organisation if not through invite journey", async () => {
    req.params.uid = "user1";
    req.session.user.isInvite = false;
    await postConfirmNewUser(req, res);

    expect(putUserInOrganisation.mock.calls).toHaveLength(0);
  });

  it("then it should add services to user", async () => {
    req.params.uid = "user1";
    await postConfirmNewUser(req, res);

    expect(addServiceToUser).toHaveBeenCalledTimes(1);
    expect(addServiceToUser).toHaveBeenCalledWith({
      userId: "user1",
      serviceId: "service1",
      organisationId: "org1",
      serviceRoleIds: [],
    });
  });

  it("then it should patch the user with the org added if existing user", async () => {
    req.session.user.isInvite = true;

    await postConfirmNewUser(req, res);

    expect(updateUserDetailsInSearchIndex).toHaveBeenCalledTimes(1);
    expect(updateUserDetailsInSearchIndex).toHaveBeenCalledWith({
      userId: "user1",
      organisations: [
        {
          categoryId: "004",
          id: "org1",
          name: "organisationId",
          roleId: 0,
          statusId: 1,
        },
        {
          categoryId: "001",
          id: "org2",
          name: "organisation two",
          urn: "12345",
          establishmentNumber: "9876",
          laNumber: "456",
          roleId: 0,
          statusId: 1,
        },
      ],
    });
  });

  it("then it should should audit an invited user", async () => {
    req.params.uid = "inv-invite1";
    req.session.user.isInvite = true;
    await postConfirmNewUser(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      "user.one@unit.test (id: user1) invited test@test.com to organisationName (id: org1) (id: inv-invite1)",
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      type: "approver",
      subType: "user-invited",
      userId: req.user.sub,
      userEmail: req.user.email,
      invitedUserEmail: req.session.user.email,
      invitedUser: req.params.uid,
      organisationid: req.params.orgId,
    });
  });

  it("then it should redirect to users list", async () => {
    req.params.uid = "inv-invite1";
    req.session.user.isInvite = true;
    await postConfirmNewUser(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/approvals/users");
  });

  it("then a flash message is displayed for a user being added to an org", async () => {
    req.session.user.isInvite = true;
    await postConfirmNewUser(req, res);

    expect(res.flash.mock.calls).toHaveLength(3);
    expect(res.flash.mock.calls[0][0]).toBe("title");
    expect(res.flash.mock.calls[0][1]).toBe(`Success`);
    expect(res.flash.mock.calls[1][0]).toBe(`heading`);
    expect(res.flash.mock.calls[1][1]).toBe(
      `${expectedFirstName} ${expectedLastName} added to organisation`,
    );
    expect(res.flash.mock.calls[2][0]).toBe(`message`);
    expect(res.flash.mock.calls[2][1]).toBe(
      `${expectedFirstName} ${expectedLastName} has been successfully added to ${expectedOrgName}`,
    );
  });

  it("then a flash message is displayed for a user being invited", async () => {
    req.params.uid = null;
    req.session.user.isInvite = true;
    await postConfirmNewUser(req, res);

    expect(res.flash.mock.calls).toHaveLength(3);
    expect(res.flash.mock.calls[0][0]).toBe("title");
    expect(res.flash.mock.calls[0][1]).toBe(`Success`);
    expect(res.flash.mock.calls[1][0]).toBe(`heading`);
    expect(res.flash.mock.calls[1][1]).toBe(`Invitation email sent`);
    expect(res.flash.mock.calls[2][0]).toBe(`message`);
    expect(res.flash.mock.calls[2][1]).toBe(
      `Invitation email sent to: ${expectedEmailAddress}`,
    );
  });

  it("then it should should audit adding services to an existing user", async () => {
    req.params.uid = "user1";
    await postConfirmNewUser(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      "user.one@unit.test added 1 service(s) for user test@test.com",
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      type: "approver",
      subType: "user-services-added",
      userId: req.user.sub,
      userEmail: req.user.email,
      organisationId: "org1",
      meta: {
        editedUser: req.params.uid,
        editedFields: [
          {
            name: "add_services",
            newValue: req.session.user.services,
          },
        ],
      },
    });
  });

  it("then it should redirect to users profile if adding services to an existing user", async () => {
    req.params.uid = "user1";
    req.session.user.uid = "user1";
    await postConfirmNewUser(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(
      `/approvals/users/${req.params.uid}`,
    );
  });

  it("then a flash message is displayed showing services have been added", async () => {
    req.params.uid = "user1";
    req.session.user.uid = "user1";
    await postConfirmNewUser(req, res);

    expect(res.flash.mock.calls).toHaveLength(3);
    expect(res.flash.mock.calls[0][0]).toBe("title");
    expect(res.flash.mock.calls[0][1]).toBe(`Success`);
    expect(res.flash.mock.calls[1][0]).toBe("heading");
    expect(res.flash.mock.calls[1][1]).toBe(`New service added: Service One`);
    expect(res.flash.mock.calls[2][0]).toBe("message");
    expect(res.flash.mock.calls[2][1]).toBe(
      "The user can now access its functions and features.",
    );
  });

  it("then it should send an email notification to user when added to organisation", async () => {
    req.params.uid = "user1";
    req.session.user.uid = "user1";
    req.session.user.isInvite = true;

    await postConfirmNewUser(req, res);

    expect(sendUserAddedToOrganisationStub.mock.calls).toHaveLength(1);

    expect(sendUserAddedToOrganisationStub.mock.calls[0][0]).toBe(
      expectedEmailAddress,
    );
    expect(sendUserAddedToOrganisationStub.mock.calls[0][1]).toBe(
      expectedFirstName,
    );
    expect(sendUserAddedToOrganisationStub.mock.calls[0][2]).toBe(
      expectedLastName,
    );
    expect(sendUserAddedToOrganisationStub.mock.calls[0][3]).toBe(
      expectedOrgName,
    );
  });

  it("then it should send an email notification to user when service added", async () => {
    req.params.uid = "user1";
    req.session.user.uid = "user1";
    req.session.user.isInvite = true;

    await postConfirmNewUser(req, res);

    expect(sendServiceRequestApprovedStub.mock.calls).toHaveLength(1);

    expect(sendServiceRequestApprovedStub.mock.calls[0][0]).toBe(
      expectedEmailAddress,
    );
    expect(sendServiceRequestApprovedStub.mock.calls[0][1]).toBe(
      expectedFirstName,
    );
    expect(sendServiceRequestApprovedStub.mock.calls[0][2]).toBe(
      expectedLastName,
    );
    expect(sendServiceRequestApprovedStub.mock.calls[0][3]).toBe(
      expectedOrgName,
    );
    expect(sendServiceRequestApprovedStub.mock.calls[0][4]).toBe(
      expectedServiceName,
    );
    expect(sendServiceRequestApprovedStub.mock.calls[0][5]).toEqual(
      expectedRoles,
    );
    expect(sendServiceRequestApprovedStub.mock.calls[0][6]).toEqual(
      expectedPermission,
    );
  });
});
