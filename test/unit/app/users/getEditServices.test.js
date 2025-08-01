jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("login.dfe.policy-engine");
jest.mock("./../../../../src/app/users/utils");
jest.mock("login.dfe.api-client/services", () => ({
  getServiceRaw: jest.fn(),
}));

const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");
const PolicyEngine = require("login.dfe.policy-engine");
const {
  getSingleServiceForUser,
  getUserDetails,
  isEditService,
  isUserManagement,
  isReviewSubServiceRequest,
} = require("./../../../../src/app/users/utils");
const { getServiceRaw } = require("login.dfe.api-client/services");
const application = {
  name: "Service One",
  relyingParty: {
    service_home: "http://service.one/login",
    redirect_uris: ["http://service.one/login/cb"],
  },
};
const user = {
  email: "test@test.com",
  firstName: "test",
  lastName: "name",
};

const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
};

describe("when displaying the edit service view", () => {
  let req;
  let res;

  let getEditService;

  beforeEach(() => {
    isEditService.mockReset();
    isUserManagement.mockReset();
    isReviewSubServiceRequest.mockReset();

    req = mockRequest();
    req.params = {
      uid: "user1",
      orgId: "org1",
      sid: "service1",
    };
    req.session = {
      rid: "rid1",
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
    getServiceRaw.mockReset().mockReturnValue(application);
    getUserDetails.mockReset().mockReturnValue(user);
    res = mockResponse();

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

    getEditService = require("./../../../../src/app/users/editServices").get;
  });

  it("then it should get the selected user service", async () => {
    await getEditService(req, res);

    expect(getSingleServiceForUser.mock.calls).toHaveLength(1);
    expect(getSingleServiceForUser.mock.calls[0][0]).toBe("user1");
    expect(getSingleServiceForUser.mock.calls[0][1]).toBe("org1");
    expect(getSingleServiceForUser.mock.calls[0][2]).toBe("service1");
    expect(getSingleServiceForUser.mock.calls[0][3]).toBe("correlationId");
  });

  it("then it should return the edit service view", async () => {
    await getEditService(req, res);
    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe("users/views/editServices");
  });

  it("then it should include csrf token", async () => {
    await getEditService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
    });
  });

  it("then it should include the organisation details", async () => {
    await getEditService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      organisationDetails: req.organisationDetails,
    });
  });

  it("then it should include the service details", async () => {
    await getEditService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      service: {
        name: "service name",
      },
    });
  });

  it("then it should include the correct backLink for editing a service for an user", async () => {
    isEditService.mockReturnValue(true);

    await getEditService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      backLink:
        "/approvals/org1/users/user1/associate-services?action=edit-service",
    });
  });

  it("then it should include the correct backLink for reviewing a sub-service request", async () => {
    isUserManagement.mockReturnValue(true);
    isReviewSubServiceRequest.mockReturnValue(true);

    await getEditService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      backLink: "/access-requests/subService-requests/rid1",
    });
  });

  it("then it should include the default backLink for editing services", async () => {
    await getEditService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      backLink: "/approvals/select-organisation-service?action=edit-service",
    });
  });
});
