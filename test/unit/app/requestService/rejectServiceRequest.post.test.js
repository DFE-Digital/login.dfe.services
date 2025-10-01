jest.mock("login.dfe.policy-engine");
jest.mock("login.dfe.jobs-client");
jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);
jest.mock("login.dfe.api-client/services", () => {
  return {
    getServiceRolesRaw: jest.fn(),
  };
});

const { NotificationClient } = require("login.dfe.jobs-client");
const {
  updateServiceRequest,
} = require("../../../../src/app/requestService/utils");
const PolicyEngine = require("login.dfe.policy-engine");
const {
  checkCacheForAllServices,
} = require("./../../../../src/infrastructure/helpers/allServicesAppCache");
const { getUserDetails } = require("../../../../src/app/users/utils");
const logger = require("./../../../../src/infrastructure/logger");

const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
  validate: jest.fn(),
};
const { getServiceRolesRaw } = require("login.dfe.api-client/services");

const sendServiceRequestOutcomeToApprovers = jest.fn();
const sendServiceRequestRejected = jest.fn();

NotificationClient.mockImplementation(() => {
  return {
    sendServiceRequestRejected,
    sendServiceRequestOutcomeToApprovers,
  };
});

jest.mock("../../../../src/app/requestService/utils", () => {
  return {
    updateServiceRequest: jest.fn(),
  };
});

jest.mock(
  "./../../../../src/infrastructure/helpers/allServicesAppCache",
  () => {
    return {
      checkCacheForAllServices: jest.fn(),
    };
  },
);

jest.mock("../../../../src/app/users/utils", () => {
  return {
    getUserDetails: jest.fn(),
  };
});

jest.mock("login.dfe.dao", () => {
  return {
    services: {},
    directories: {},
  };
});

describe("when posting a service rejection", () => {
  let req;
  let res;

  let postRejectServiceRequest;

  beforeEach(() => {
    req = {
      body: {},
      user: {
        uid: "mock-uid",
        email: "mock-email",
        sub: "mock-sub",
      },
      session: {
        user: {
          firstName: "mock-first-name",
          lastName: "mock-last-name",
          email: "mock-email",
          uid: "mock-uid",
        },
      },
      csrfToken: jest.fn(),
      params: {
        sid: "service1",
        orgId: "organisationId",
        rids: [0],
      },
      query: {},
      userOrganisations: [
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

    res = {
      status: jest.fn(),
      redirect: jest.fn(),
      render: jest.fn(),
      flash: jest.fn(),
    };

    checkCacheForAllServices.mockReset();
    checkCacheForAllServices.mockReturnValue({
      services: [
        {
          id: "service1",
          name: "service name",
        },
      ],
    });

    getUserDetails.mockReset();
    getUserDetails.mockReturnValue({
      id: "user1",
      email: "email@email.com",
      firstName: "test",
      lastName: "name",
    });

    updateServiceRequest.mockReset();
    updateServiceRequest.mockReturnValue({ success: true });

    sendServiceRequestRejected.mockReset();
    sendServiceRequestOutcomeToApprovers.mockReset();

    policyEngine.validate.mockReset().mockReturnValue([]);
    PolicyEngine.mockReset().mockImplementation(() => policyEngine);

    postRejectServiceRequest =
      require("../../../../src/app/requestService/rejectServiceRequest").post;

    getServiceRolesRaw.mockReset().mockReturnValue([
      {
        code: "role_code",
        id: "role1",
        name: "role_name",
        status: {
          id: "status_id",
        },
      },
    ]);
  });

  it("should redirect to /my-services when there is no session", async () => {
    req.session.user = undefined;

    await postRejectServiceRequest(req, res);
    expect(res.redirect).toHaveBeenCalledWith("/my-services");
  });

  it("then it should render `rejectServiceRequest` view with error if there are validation messages", async () => {
    policyEngine.validate.mockReturnValue([
      { message: "There has been an error" },
    ]);

    await postRejectServiceRequest(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      `requestService/views/rejectServiceRequest`,
    );
    expect(res.render.mock.calls[0][1]).toMatchObject({
      validationMessages: {
        roles: ["There has been an error"],
      },
    });
  });

  it("should render rejectServiceRequest when a request contains no reason in the body", async () => {
    await postRejectServiceRequest(req, res);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestService/views/rejectServiceRequest",
    );
    expect(res.render.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        validationMessages: {
          reason: "Enter a reason for rejection",
        },
      }),
    );
  });

  it("should render rejectServiceRequest when a request contains and empty reason in the body", async () => {
    req.body.reason = "";

    await postRejectServiceRequest(req, res);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestService/views/rejectServiceRequest",
    );
    expect(res.render.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        validationMessages: {
          reason: "Enter a reason for rejection",
        },
      }),
    );
  });

  it("should render rejectServiceRequest when a request contains a space padded reason in the body", async () => {
    req.body.reason = "     ";

    await postRejectServiceRequest(req, res);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestService/views/rejectServiceRequest",
    );
    expect(res.render.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        validationMessages: {
          reason: "Enter a reason for rejection",
        },
      }),
    );
  });

  it("should render rejectServiceRequest with 'Reason cannot be longer than 1000 characters'", async () => {
    req.body.reason = "x".repeat(1001);

    await postRejectServiceRequest(req, res);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestService/views/rejectServiceRequest",
    );
    expect(res.render.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        validationMessages: {
          reason: "Reason cannot be longer than 1000 characters",
        },
      }),
    );
  });

  it("should send notification emails to the user and approvers on rejection success", async () => {
    req.body.reason = "x".repeat(10);

    await postRejectServiceRequest(req, res);

    expect(sendServiceRequestRejected.mock.calls).toHaveLength(1);
    expect(sendServiceRequestRejected.mock.calls[0][0]).toBe("mock-email");
    expect(sendServiceRequestRejected.mock.calls[0][1]).toBe("mock-first-name");
    expect(sendServiceRequestRejected.mock.calls[0][2]).toBe("mock-last-name");
    expect(sendServiceRequestRejected.mock.calls[0][3]).toBe(
      "organisationName",
    );
    expect(sendServiceRequestRejected.mock.calls[0][4]).toBe("service name");
    expect(sendServiceRequestRejected.mock.calls[0][5]).toStrictEqual([]);
    expect(sendServiceRequestRejected.mock.calls[0][6]).toBe("xxxxxxxxxx");

    expect(sendServiceRequestOutcomeToApprovers.mock.calls).toHaveLength(1);
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][0]).toBe(
      "mock-sub",
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][1]).toBe(
      "mock-email",
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][2]).toBe(
      "mock-first-name mock-last-name",
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][3]).toBe(
      "organisationId",
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][4]).toBe(
      "organisationName",
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][5]).toBe(
      "service name",
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][6]).toStrictEqual(
      [],
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][7]).toBe(false);
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][8]).toBe(
      "xxxxxxxxxx",
    );
  });

  it("should succeed and redirect to /my-services", async () => {
    req.body.reason = "x".repeat(10);

    await postRejectServiceRequest(req, res);

    expect(res.redirect).toHaveBeenCalledWith("/my-services");
    expect(res.flash.mock.calls[0]).toEqual(
      expect.arrayContaining(["title", "Success"]),
    );
    expect(res.flash.mock.calls[1]).toEqual(
      expect.arrayContaining(["heading", "Request rejected successfully"]),
    );
    expect(res.flash.mock.calls[2]).toEqual(
      expect.arrayContaining([
        "message",
        "An email will be sent to the requestee informing them of their request rejection.",
      ]),
    );

    expect(logger.audit).toHaveBeenCalledWith({
      application: undefined,
      env: "test-run",
      message:
        "mock-email (approverId: mock-sub) rejected service (serviceId: service1), roles (roleIds: []) and organisation (orgId: organisationId) for end user (endUserId: undefined). The reject reason is xxxxxxxxxx - requestId (reqId: undefined)",
      subType: "access-request-rejected",
      type: "services",
      userEmail: "mock-email",
      userId: "mock-uid",
    });
  });
});
