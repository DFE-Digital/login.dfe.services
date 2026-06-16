const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");

describe("when posting the existing user view", () => {
  let req;
  let res;

  let postConfirmExistingUser;

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
        uid: "userid",
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
          id: "organisationId",
          name: "organisationName",
        },
        role: {
          id: 0,
          name: "category name",
        },
      },
    ];
    res = mockResponse();

    postConfirmExistingUser =
      require("./../../../../src/app/users/confirmExistingUser").post;
  });

  it("then it should redirect to organisation permissions", async () => {
    await postConfirmExistingUser(req, res);

    expect(res.sessionRedirect.mock.calls).toHaveLength(1);
    expect(res.sessionRedirect.mock.calls[0][0]).toBe(
      `/approvals/${req.params.orgId}/users/${req.session.user.uid}/organisation-permissions`,
    );
  });

  it("then it should redirect to confirm details", async () => {
    req.query.review = "true";
    await postConfirmExistingUser(req, res);

    expect(res.sessionRedirect.mock.calls).toHaveLength(1);
    expect(res.sessionRedirect.mock.calls[0][0]).toBe(
      `/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-details`,
    );
  });

  it("should redirect if there is no user in the session", async () => {
    req.session.user = undefined;
    await postConfirmExistingUser(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/approvals/users");
  });

  describe("when a savedInvite exists in the session from a concurrent /my-services visit", () => {
    const savedInviteState = {
      isInvite: true,
      email: "invitee@test.com",
      firstName: "New",
      lastName: "User",
      uid: "invite-uid",
      permission: 0,
      services: [],
    };

    it("then it should restore the invite session when params.uid is undefined (new-user invite)", async () => {
      req.session.user = { uid: "userid", services: [] };
      req.session.savedInvite = { ...savedInviteState };
      req.params.uid = undefined;

      await postConfirmExistingUser(req, res);

      expect(req.session.savedInvite).toBeUndefined();
      expect(req.session.user.isInvite).toBe(true);
      expect(req.session.user.email).toBe("invitee@test.com");
    });

    it("then it should restore the invite session when params.uid is a different user (existing-user invite)", async () => {
      req.session.user = { uid: "userid", services: [] };
      req.session.savedInvite = { ...savedInviteState };
      req.params.uid = "some-other-user";

      await postConfirmExistingUser(req, res);

      expect(req.session.savedInvite).toBeUndefined();
      expect(req.session.user.isInvite).toBe(true);
    });

    it("then it should not restore the invite session when params.uid matches the approver (self-service route)", async () => {
      req.session.user = { uid: "userid", services: [] };
      req.session.savedInvite = { ...savedInviteState };
      req.params.uid = "user1";

      await postConfirmExistingUser(req, res);

      expect(req.session.savedInvite).toBeDefined();
      expect(req.session.user.isInvite).toBeUndefined();
    });
  });
});
