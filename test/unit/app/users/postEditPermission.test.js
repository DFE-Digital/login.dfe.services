const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");

jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);

jest.mock("./../../../../src/infrastructure/organisations", () => {
  return {
    putUserInOrganisation: jest.fn(),
    putInvitationInOrganisation: jest.fn(),
    getOrganisationAndServiceForUser: jest.fn(),
  };
});

jest.mock("login.dfe.api-client/users", () => {
  return {
    searchUserByIdRaw: jest.fn(),
    updateUserDetailsInSearchIndex: jest.fn(),
  };
});

jest.mock("./../../../../src/app/users/utils");

const logger = require("./../../../../src/infrastructure/logger");
const { getUserDetails } = require("./../../../../src/app/users/utils");
const {
  putUserInOrganisation,
  putInvitationInOrganisation,
  getOrganisationAndServiceForUser,
} = require("./../../../../src/infrastructure/organisations");

const {
  searchUserByIdRaw,
  updateUserDetailsInSearchIndex,
} = require("login.dfe.api-client/users");

jest.mock("login.dfe.jobs-client");
const { NotificationClient } = require("login.dfe.jobs-client");
const sendUserPermissionChangedStub = jest.fn();

describe("when editing organisation permission level", () => {
  let req;
  let res;
  let postEditPermission;

  const organisationName = "organisationName";
  const expectedEmailAddress = "email@email.com";
  const expectedFirstName = "test";
  const expectedLastName = "name";
  const expectedPermission = [
    {
      id: 10000,
      name: "Approver",
      oldName: "End user",
    },
    {
      id: 0,
      name: "End user",
      oldName: "Approver",
    },
  ];

  beforeEach(() => {
    req = mockRequest();

    req.params = {
      uid: "user1",
      orgId: "org1",
      sid: "service1",
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
      selectedLevel: 10000,
    };

    getUserDetails.mockReset();
    getUserDetails.mockReturnValue({
      id: "user1",
      email: "email@email.com",
      firstName: "test",
      lastName: "name",
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
    });

    res = mockResponse();
    postEditPermission =
      require("./../../../../src/app/users/editPermission").post;
    getOrganisationAndServiceForUser.mockReset().mockReturnValue([
      {
        organisation: {
          id: "org1",
          name: "Great Big School",
        },
        role: {
          id: 0,
          name: "End user",
        },
      },
    ]);

    sendUserPermissionChangedStub.mockReset();
    NotificationClient.mockReset().mockImplementation(() => ({
      sendUserPermissionChanged: sendUserPermissionChangedStub,
    }));
  });

  it("then it should edit organisation permission level for invitation", async () => {
    req.params.uid = "inv-invite1";

    await postEditPermission(req, res);

    expect(putInvitationInOrganisation.mock.calls).toHaveLength(1);
    expect(putInvitationInOrganisation.mock.calls[0][0]).toBe("invite1");
    expect(putInvitationInOrganisation.mock.calls[0][1]).toBe("org1");
  });

  it("then it should edit organisation permission level for user", async () => {
    await postEditPermission(req, res);

    expect(putUserInOrganisation.mock.calls).toHaveLength(1);
    expect(putUserInOrganisation.mock.calls[0][0]).toBe("user1");
    expect(putUserInOrganisation.mock.calls[0][1]).toBe("org1");
  });

  it("then it should update the search index with the new roleId", async () => {
    await postEditPermission(req, res);
    expect(updateUserDetailsInSearchIndex).toHaveBeenCalledTimes(1);
    expect(updateUserDetailsInSearchIndex).toHaveBeenCalledWith({
      userId: "user1",
      organisations: [
        {
          categoryId: "004",
          id: "org1",
          name: "organisationId",
          roleId: 10000,
          statusId: 1,
        },
      ],
    });
  });

  it("then it should should audit permission level being edited", async () => {
    await postEditPermission(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      "user.one@unit.test (id: user1) edited permission level to approver for org organisationName (id: org1) for user email@email.com (id: user1)",
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      type: "approver",
      subType: "user-org-permission-edited",
      userId: "user1",
      userEmail: "user.one@unit.test",
      meta: {
        editedUser: "user1",
        editedFields: [
          {
            name: "edited_permission",
            newValue: "Approver",
          },
        ],
      },
    });
  });

  it("then it should redirect to user details", async () => {
    await postEditPermission(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(
      `/approvals/users/${req.params.uid}`,
    );
  });

  it("then a flash message is shown to the user", async () => {
    await postEditPermission(req, res);

    expect(res.flash.mock.calls).toHaveLength(3);
    expect(res.flash.mock.calls[0][0]).toBe("title");
    expect(res.flash.mock.calls[0][1]).toBe(`Success`);
    expect(res.flash.mock.calls[1][0]).toBe("heading");
    expect(res.flash.mock.calls[1][1]).toBe(
      `Permission level upgraded to approver`,
    );
    expect(res.flash.mock.calls[2][0]).toBe("message");
    expect(res.flash.mock.calls[2][1]).toBe(
      `${expectedFirstName} ${expectedLastName} is now an ${expectedPermission[0].name.toLocaleLowerCase()} at ${organisationName}`,
    );
  });

  it("then it should send an email notification to user that its permission has changed to approver", async () => {
    req.body.selectedLevel = 10000;

    await postEditPermission(req, res);

    expect(sendUserPermissionChangedStub.mock.calls).toHaveLength(1);

    expect(sendUserPermissionChangedStub.mock.calls[0][0]).toBe(
      expectedEmailAddress,
    );
    expect(sendUserPermissionChangedStub.mock.calls[0][1]).toBe(
      expectedFirstName,
    );
    expect(sendUserPermissionChangedStub.mock.calls[0][2]).toBe(
      expectedLastName,
    );
    expect(sendUserPermissionChangedStub.mock.calls[0][3]).toBe(
      organisationName,
    );
    expect(sendUserPermissionChangedStub.mock.calls[0][4]).toEqual(
      expectedPermission[0],
    );
  });

  it("then it should send an email notification to user that its permission has changed to end user", async () => {
    req.body.selectedLevel = 0;
    getOrganisationAndServiceForUser.mockReset().mockReturnValue([
      {
        organisation: {
          id: "org1",
          name: "Great Big School",
        },
        role: {
          id: 10000,
          name: "Approver",
        },
      },
    ]);

    await postEditPermission(req, res);

    expect(sendUserPermissionChangedStub.mock.calls).toHaveLength(1);

    expect(sendUserPermissionChangedStub.mock.calls[0][0]).toBe(
      expectedEmailAddress,
    );
    expect(sendUserPermissionChangedStub.mock.calls[0][1]).toBe(
      expectedFirstName,
    );
    expect(sendUserPermissionChangedStub.mock.calls[0][2]).toBe(
      expectedLastName,
    );
    expect(sendUserPermissionChangedStub.mock.calls[0][3]).toBe(
      organisationName,
    );
    expect(sendUserPermissionChangedStub.mock.calls[0][4]).toEqual(
      expectedPermission[1],
    );
  });
});
