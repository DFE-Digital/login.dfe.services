const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");

describe("when displaying the existing user view", () => {
  let req;
  let res;

  let getConfirmExistingUser;

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

    getConfirmExistingUser =
      require("./../../../../src/app/users/confirmExistingUser").get;
  });

  it("then it should return the confirm user details view", async () => {
    await getConfirmExistingUser(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe("users/views/confirmExistingUser");
  });

  it("then it should include the correct data", async () => {
    await getConfirmExistingUser(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
      user: req.session.user,
      organisationDetails: req.organisationDetails,
    });
  });

  it("should redirect if there is no user in the session", async () => {
    req.session.user = undefined;
    await getConfirmExistingUser(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/approvals/users");
  });
});
