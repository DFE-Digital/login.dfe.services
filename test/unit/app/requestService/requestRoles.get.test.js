jest.mock("login.dfe.policy-engine");
jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);
jest.mock("login.dfe.api-client/services", () => ({
  getServiceRaw: jest.fn(),
}));

const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");
const PolicyEngine = require("login.dfe.policy-engine");
const { getServiceRaw } = require("login.dfe.api-client/services");
const logger = require("./../../../../src/infrastructure/logger");

const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
};

describe("when displaying the sub-services view", () => {
  let req;
  let res;

  let getRequestRoles;

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

    policyEngine.getPolicyApplicationResultsForUser
      .mockReset()
      .mockReturnValue({
        rolesAvailableToUser: [],
      });
    PolicyEngine.mockReset().mockImplementation(() => policyEngine);

    getRequestRoles =
      require("./../../../../src/app/requestService/requestRoles").get;
  });

  it("then it should return the sub-service view", async () => {
    await getRequestRoles(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestService/views/requestRoles",
    );
  });

  it("then it should include csrf token", async () => {
    await getRequestRoles(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
    });
  });

  it("then it should include the current service", async () => {
    await getRequestRoles(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      currentService: 1,
    });
  });

  it("then it should get the service details", async () => {
    await getRequestRoles(req, res);
    expect(getServiceRaw.mock.calls).toHaveLength(1);
    expect(getServiceRaw.mock.calls[0][0]).toMatchObject({
      by: { serviceId: "service1" },
    });
  });

  it("then it should redirect the user to /my-services and log a warning message if user services do not exist in the session", async () => {
    req.session.user.services = undefined;
    req.originalUrl = "test/foo";
    await getRequestRoles(req, res);

    expect(res.redirect).toHaveBeenCalledTimes(1);
    expect(res.redirect).toHaveBeenCalledWith("/my-services");
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      `GET ${req.originalUrl} missing user session services, redirecting to my-services`,
    );
  });

  it("then it should redirect the user to /my-services and log a warning message if user services are empty in the session", async () => {
    req.session.user.services = [];
    req.originalUrl = "test/foo";
    await getRequestRoles(req, res);

    expect(res.redirect).toHaveBeenCalledTimes(1);
    expect(res.redirect).toHaveBeenCalledWith("/my-services");
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      `GET ${req.originalUrl} missing user session services, redirecting to my-services`,
    );
  });
});
