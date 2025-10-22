jest.mock("./../../../../src/infrastructure/config", () =>
  require("../../../utils/jestMocks").mockConfig(),
);
jest.mock("login.dfe.policy-engine");
jest.mock("./../../../../src/app/users/utils");
jest.mock("login.dfe.api-client/services", () => ({
  getServiceRaw: jest.fn(),
}));

const { mockRequest, mockResponse } = require("../../../utils/jestMocks");
const PolicyEngine = require("login.dfe.policy-engine");
const {
  getSingleServiceForUser,
  getUserDetails,
  isEditService,
  isUserManagement,
  isReviewSubServiceRequest,
} = require("../../../../src/app/users/utils");
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
  validate: jest.fn(),
};

describe("when hitting the post function of edit service", () => {
  let req;
  let res;

  let postEditService;

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

    postEditService = require("../../../../src/app/users/editServices").post;
  });

  it("should render the approvals screen if there is no user in the session", async () => {
    req.session.user = undefined;
    await postEditService(req, res);

    expect(res.redirect).toHaveBeenCalledTimes(1);
    expect(res.redirect).toHaveBeenCalledWith("/approvals/org1/users/user1");
  });

  it("should render a view with error if there are validation messages", async () => {
    policyEngine.validate.mockReturnValue([
      { message: "There has been an error" },
    ]);

    await postEditService(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(`users/views/editServices`);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      validationMessages: {
        roles: ["There has been an error"],
      },
    });
  });
});
