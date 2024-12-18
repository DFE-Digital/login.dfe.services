jest.mock("../../../../src/infrastructure/config", () =>
  require("../../../utils/jestMocks").mockConfig(),
);
jest.mock("login.dfe.policy-engine");
jest.mock("../../../../src/app/users/utils");
jest.mock("../../../../src/infrastructure/applications", () => {
  return {
    getApplication: jest.fn(),
  };
});
jest.mock("login.dfe.dao", () => require("../../../utils/jestMocks").mockDao());

const { mockRequest, mockResponse } = require("../../../utils/jestMocks");
const PolicyEngine = require("login.dfe.policy-engine");
const { getSingleServiceForUser } = require("../../../../src/app/users/utils");
const {
  getApplication,
} = require("../../../../src/infrastructure/applications");
const application = {
  name: "Service One",
  relyingParty: {
    service_home: "http://service.one/login",
    redirect_uris: ["http://service.one/login/cb"],
  },
};
const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
  validate: jest.fn(),
};
jest.mock("../../../../src/app/requestService/utils", () => {
  return {
    createServiceRequest: jest.fn(),
    checkForActiveRequests: jest.fn(),
  };
});
describe("when displaying the request edit service view", () => {
  let req;
  let res;

  let postRequestEditRoles;

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
          id: "organisationId",
          name: "organisationName",
        },
        role: {
          id: 0,
          name: "category name",
        },
      },
    ];
    getApplication.mockReset().mockReturnValue(application);
    res = mockResponse();
    policyEngine.validate.mockReset().mockReturnValue([]);
    policyEngine.getPolicyApplicationResultsForUser
      .mockReset()
      .mockReturnValue({
        rolesAvailableToUser: [],
      });
    PolicyEngine.mockReset().mockImplementation(() => policyEngine);

    getSingleServiceForUser.mockReset();
    getSingleServiceForUser.mockReturnValue({
      id: "service1",
      dateActivated: "10/10/2018",
      name: "service name",
      status: "active",
    });

    postRequestEditRoles =
      require("../../../../src/app/requestService/requestEditRoles").post;
  });

  it("then it should redirect to Services dashboard if no user in the session", async () => {
    req.session.user = null;
    await postRequestEditRoles(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/my-services");
  });

  it("then it should render `requestEditRoles` view with error if selection do not meet requirements of service", async () => {
    policyEngine.validate.mockReturnValue([
      { message: "A maximum of 1 role can be selected" },
    ]);

    await postRequestEditRoles(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      `requestService/views/requestEditRoles`,
    );
    expect(res.render.mock.calls[0][1]).toMatchObject({
      validationMessages: {
        roles: ["A maximum of 1 role can be selected"],
      },
    });
  });

  it("then it should save the selected roles in the session if selection meet requirements of service", async () => {
    req.body = {
      role: "roleId1",
    };
    await postRequestEditRoles(req, res);

    expect(req.session).toMatchObject({
      service: { roles: ["roleId1"] },
    });
  });

  it("then it should redirect to confirmEditRolesRequest page if selection meet requirements of service", async () => {
    await postRequestEditRoles(req, res);

    expect(res.sessionRedirect.mock.calls).toHaveLength(1);
    expect(res.sessionRedirect.mock.calls[0][0]).toBe(
      `service1/confirm-edit-roles-request`,
    );
  });
});
