const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");

jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);

jest.mock("./../../../../src/infrastructure/account", () => ({
  getByEmail: jest.fn(),
  getById: jest.fn(),
  getInvitationByEmail: jest.fn(),
  resendInvitation: jest.fn(),
  updateInvite: jest.fn(),
}));

jest.mock("login.dfe.api-client/users", () => {
  return {
    updateUserDetailsInSearchIndex: jest.fn(),
  };
});

jest.mock("./../../../../src/app/users/utils");

const Account = require("./../../../../src/infrastructure/account");
const {
  updateUserDetailsInSearchIndex,
} = require("login.dfe.api-client/users");
const logger = require("./../../../../src/infrastructure/logger");
const config = require("../../../../src/infrastructure/config");

describe("when resending an invitation", () => {
  let req;
  let res;

  let postResendInvitation;

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
    req.body = {
      email: "johndoe@someschool.com",
    };
    res = mockResponse();

    Account.getByEmail.mockReset().mockReturnValue(null);
    Account.getById.mockReset().mockReturnValue(null);
    Account.getInvitationByEmail.mockReset().mockReturnValue(null);

    postResendInvitation =
      require("./../../../../src/app/users/resendInvitation").post;
  });

  it("then it should include user details in session", async () => {
    await postResendInvitation(req, res);

    expect(req.session.user).not.toBeNull();
    expect(req.session.user.firstName).toBe("test");
    expect(req.session.user.lastName).toBe("name");
    expect(req.session.user.email).toBe("johndoe@someschool.com");
  });

  it("then it should render view if email not entered", async () => {
    req.body.email = "";

    await postResendInvitation(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "users/views/confirmResendInvitation",
    );
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: "token",
      email: "",
      user: {
        name: "test name",
      },
      backLink: true,
      currentPage: "users",
      noChangedEmail: false,
      uid: "user1",
      validationMessages: {
        email: "Please enter an email address",
      },
    });
  });

  it("then it should render view if email not a valid email address", async () => {
    req.body.email = "not-an-email";

    await postResendInvitation(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "users/views/confirmResendInvitation",
    );
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: "token",
      email: "not-an-email",
      user: {
        name: "test name",
      },
      backLink: true,
      currentPage: "users",
      noChangedEmail: false,
      uid: "user1",
      validationMessages: {
        email: "Please enter a valid email address",
      },
    });
  });

  it("then it should render view if email is a blacklisted email and environment is Production", async () => {
    req.body.email = "blacklisted.domain@hotmail.com";

    await postResendInvitation(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "users/views/confirmResendInvitation",
    );
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: "token",
      email: "blacklisted.domain@hotmail.com",
      user: {
        name: "test name",
      },
      backLink: true,
      currentPage: "users",
      noChangedEmail: false,
      uid: "user1",
      validationMessages: {
        email:
          "This email address is not valid for this service. Generic email names (for example, headmaster@, admin@) and domains (for example, @yahoo.co.uk, @gmail.com) compromise security. Enter an email address that is associated with your organisation.",
      },
    });
  });

  it("then it should render view if email is a blacklisted email and environment is other than Production", async () => {
    req.body.email = "blacklisted.domain@hotmail.com";
    config.toggles.environmentName = "dev";

    await postResendInvitation(req, res);

    expect(res.render.mock.calls).toHaveLength(0);
  });

  it("then it should render view if email already associated to a user", async () => {
    Account.getById.mockReturnValue({
      claims: {
        sub: "user1",
      },
    });
    Account.getByEmail.mockReturnValue({
      claims: {
        sub: "user1",
      },
    });

    await postResendInvitation(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "users/views/confirmResendInvitation",
    );
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: "token",
      email: "johndoe@someschool.com",
      user: {
        name: "test name",
      },
      backLink: true,
      currentPage: "users",
      noChangedEmail: false,
      uid: "user1",
      validationMessages: {
        email: "A DfE Sign-in user already exists with that email address",
      },
    });
  });

  it("then it should render view if email already associated to a invitation", async () => {
    Account.getInvitationByEmail.mockReturnValue({
      id: "inv1",
    });

    await postResendInvitation(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "users/views/confirmResendInvitation",
    );
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: "token",
      email: "johndoe@someschool.com",
      user: {
        name: "test name",
      },
      backLink: true,
      currentPage: "users",
      noChangedEmail: false,
      uid: "user1",
      validationMessages: {
        email: "A DfE Sign-in user already exists with that email address",
      },
    });
  });

  it("then it should update invite with new email if email changed", async () => {
    req.params.uid = "inv-user1";

    await postResendInvitation(req, res);

    expect(Account.updateInvite.mock.calls).toHaveLength(1);
    expect(Account.updateInvite.mock.calls[0][0]).toBe("user1");
    expect(Account.updateInvite.mock.calls[0][1]).toBe(
      "johndoe@someschool.com",
    );
  });

  it("then it should update the search index with the new email if email changed", async () => {
    await postResendInvitation(req, res);
    expect(updateUserDetailsInSearchIndex).toHaveBeenCalledTimes(1);
    expect(updateUserDetailsInSearchIndex).toHaveBeenCalledWith({
      userId: "user1",
      userEmail: "johndoe@someschool.com",
    });
  });

  it("then it should resend invite if email not changed", async () => {
    req.params.uid = "inv-user1";
    req.body.email = "test@test.com";
    await postResendInvitation(req, res);

    expect(Account.resendInvitation.mock.calls).toHaveLength(1);
    expect(Account.resendInvitation.mock.calls[0][0]).toBe("user1");
  });

  it("then it should should audit resent invitation", async () => {
    await postResendInvitation(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      "user.one@unit.test (id: user1) resent invitation email to johndoe@someschool.com (id: userid)",
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      type: "approver",
      subType: "resent-invitation",
      userId: "user1",
      userEmail: "user.one@unit.test",
      invitedUser: "userid",
      invitedUserEmail: "johndoe@someschool.com",
    });
  });

  it("then it should redirect to user details", async () => {
    await postResendInvitation(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/users`);
  });

  it("then a flash message is shown to the user", async () => {
    await postResendInvitation(req, res);

    expect(res.flash.mock.calls).toHaveLength(3);
    expect(res.flash.mock.calls[0][0]).toBe("title");
    expect(res.flash.mock.calls[0][1]).toBe(`Success`);
    expect(res.flash.mock.calls[1][0]).toBe(`heading`);
    expect(res.flash.mock.calls[1][1]).toBe(`Invitation email sent`);
    expect(res.flash.mock.calls[2][0]).toBe(`message`);
    expect(res.flash.mock.calls[2][1]).toBe(
      `Invitation email sent to: ${req.body.email}`,
    );
  });
});
