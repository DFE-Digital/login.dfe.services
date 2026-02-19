const {
  mockRequest,
  mockResponse,
  mockAdapterConfig,
} = require("./../../../utils/jestMocks");

const mockGetSingleServiceForUser = jest.fn();

jest.mock("./../../../../src/app/users/utils", () => ({
  ...jest.requireActual("./../../../../src/app/users/utils"),
  getSingleServiceForUser: mockGetSingleServiceForUser,
}));

const {
  getSingleServiceForUser,
} = require("./../../../../src/app/users/utils");

jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);
jest.mock("./../../../../src/app/users/utils");

jest.mock(
  "./../../../../src/infrastructure/helpers/allServicesAppCache",
  () => {
    return {
      checkCacheForAllServices: jest.fn(),
    };
  },
);
jest.mock("./../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});
jest.mock("login.dfe.dao", () => {
  return {
    services: {
      list: async () => {
        return {
          count: 10,
          rows: [
            {
              id: "service1",
              isExternalService: true,
              isMigrated: true,
              name: "Service One",
            },
            {
              id: "service2",
              isExternalService: true,
              isMigrated: true,
              name: "Service two",
            },
          ],
        };
      },
    },
  };
});

describe("when displaying the remove service access view", () => {
  let req;
  let res;

  let getRemoveService;

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
    res = mockResponse();

    getSingleServiceForUser.mockReset();
    getSingleServiceForUser.mockReturnValue({
      id: "service1",
      dateActivated: "10/10/2018",
      name: "service name",
      status: "active",
    });

    getRemoveService =
      require("./../../../../src/app/users/removeServiceAccess").get;
  });

  it("should redirect if there is no user in the session", async () => {
    req = mockRequest({
      params: {
        uid: "user1",
        orgId: "org1",
        sid: "service1",
      },
    });
    await getRemoveService(req, res);

    expect(res.redirect.mock.calls.length).toBe(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/approvals/users/user1");
  });

  it("then it should get the selected user service", async () => {
    await getRemoveService(req, res);

    expect(getSingleServiceForUser.mock.calls).toHaveLength(1);
    expect(getSingleServiceForUser.mock.calls[0][0]).toBe("user1");
    expect(getSingleServiceForUser.mock.calls[0][1]).toBe("org1");
    expect(getSingleServiceForUser.mock.calls[0][2]).toBe("service1");
    expect(getSingleServiceForUser.mock.calls[0][3]).toBe("correlationId");
  });

  it("then it should return the confirm remove service view", async () => {
    await getRemoveService(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "users/views/removeServiceRedesigned",
    );
  });

  it("then it should include expected data", async () => {
    await getRemoveService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
      organisationDetails: req.organisationDetails,
      service: getSingleServiceForUser(),
      cancelLink: "/my-services",
    });
    expect(res.render.mock.calls[0][1].backLink).toBe(
      "/approvals/select-organisation-service?action=remove-service",
    );
  });

  it("should have a '/approvals/org1/users/user1/associate-services' backlink if action is remove-service", async () => {
    req.query = {
      action: "remove-service",
    };
    await getRemoveService(req, res);

    expect(res.render.mock.calls[0][1].backLink).toBe(
      "/approvals/org1/users/user1/associate-services?action=remove-service",
    );
  });

  const testCases = ["organisation-invite", "view-organisation-requests"];

  it.each(testCases)(
    "should have a '/approvals/users/user1' backLink and cancelLinkif action is %s",
    async (action) => {
      req.query = {
        action,
      };
      await getRemoveService(req, res);

      expect(res.render.mock.calls[0][1].backLink).toBe(
        "/approvals/users/user1",
      );
      expect(res.render.mock.calls[0][1].cancelLink).toBe(
        "/approvals/users/user1",
      );
    },
  );

  it("should have a '/approvals/users/user1' backlink if not remove service or is a user management action", async () => {
    // Note: actions instead of action
    req.query = {
      actions: "review-subservice-request",
    };
    await getRemoveService(req, res);

    expect(res.render.mock.calls[0][1].backLink).toBe("/approvals/users/user1");
  });
});
