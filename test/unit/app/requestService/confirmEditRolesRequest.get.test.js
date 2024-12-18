const { mockRequest, mockResponse } = require("../../../utils/jestMocks");
const { getSingleServiceForUser } = require("../../../../src/app/users/utils");
const { listRolesOfService } = require("../../../../src/infrastructure/access");

jest.mock("login.dfe.dao", () => require("../../../utils/jestMocks").mockDao());
jest.mock("../../../../src/infrastructure/config", () =>
  require("../../../utils/jestMocks").mockConfig(),
);
jest.mock("../../../../src/infrastructure/logger", () =>
  require("../../../utils/jestMocks").mockLogger(),
);
jest.mock("../../../../src/infrastructure/access", () => {
  return { listRolesOfService: jest.fn() };
});
jest.mock("../../../../src/app/users/utils");

describe("when displaying the edit roles Review request view", () => {
  let req;
  let res;

  let getConfirmEditRolesRequest;

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
        roles: ["role1"],
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

    getSingleServiceForUser.mockReset();
    getSingleServiceForUser.mockReturnValue({
      id: "service1",
      dateActivated: "10/10/2018",
      name: "service name",
      status: "active",
    });

    listRolesOfService.mockReset();
    listRolesOfService.mockReturnValue([
      {
        code: "role_code",
        id: "role1",
        name: "role_name",
        status: {
          id: "status_id",
        },
      },
    ]);

    getConfirmEditRolesRequest =
      require("../../../../src/app/requestService/confirmEditRolesRequest").get;
  });

  it("then it should get the selected service", async () => {
    await getConfirmEditRolesRequest(req, res);

    expect(getSingleServiceForUser.mock.calls).toHaveLength(1);
    expect(getSingleServiceForUser.mock.calls[0][0]).toBe("user1");
    expect(getSingleServiceForUser.mock.calls[0][1]).toBe("org1");
    expect(getSingleServiceForUser.mock.calls[0][2]).toBe("service1");
    expect(getSingleServiceForUser.mock.calls[0][3]).toBe("correlationId");
  });

  it("then it should get the selected roles", async () => {
    await getConfirmEditRolesRequest(req, res);

    expect(listRolesOfService.mock.calls).toHaveLength(1);
    expect(listRolesOfService.mock.calls[0][0]).toBe("service1");
    expect(listRolesOfService.mock.calls[0][1]).toBe("correlationId");
  });

  it("then it should return the `confirmEditRolesRequest` view", async () => {
    await getConfirmEditRolesRequest(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestService/views/confirmEditRolesRequest",
    );
  });

  it("then it should include the csrf token", async () => {
    await getConfirmEditRolesRequest(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
    });
  });

  it("then it should include the organisation details", async () => {
    await getConfirmEditRolesRequest(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      organisationDetails: req.organisationDetails,
    });
  });

  it("then it should include the service details", async () => {
    await getConfirmEditRolesRequest(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      service: getSingleServiceForUser(),
    });
  });

  it("then it should include the back link", async () => {
    await getConfirmEditRolesRequest(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      backLink: `/request-service/${req.params.orgId}/users/${req.params.uid}/edit-services/${req.params.sid}`,
    });
  });

  it("then it should include the Cancel link", async () => {
    await getConfirmEditRolesRequest(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      cancelLink: "/my-services",
    });
  });

  it("then it should include the End user details", async () => {
    await getConfirmEditRolesRequest(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      user: {
        email: "test@test.com",
        firstName: "test",
        lastName: "name",
      },
    });
  });
  it("then it should include the selected roles", async () => {
    await getConfirmEditRolesRequest(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      roles: [
        {
          code: "role_code",
          id: "role1",
          name: "role_name",
          status: {
            id: "status_id",
          },
        },
      ],
    });
  });
});
