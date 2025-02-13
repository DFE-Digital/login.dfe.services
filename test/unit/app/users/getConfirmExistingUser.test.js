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

  it("then it should include csrf token", async () => {
    await getConfirmExistingUser(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
    });
  });

  it("then it should include the organisation details", async () => {
    await getConfirmExistingUser(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      organisationDetails: req.organisationDetails,
    });
  });

  it("then it should include the user details", async () => {
    await getConfirmExistingUser(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      user: req.session.user,
    });
  });
});
