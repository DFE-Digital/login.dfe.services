const {
  mockRequest,
  mockResponse,
  mockAdapterConfig,
} = require("../../../utils/jestMocks");
const {
  checkCacheForAllServices,
} = require("../../../../src/infrastructure/helpers/allServicesAppCache");
const { getUserDetails } = require("../../../../src/app/users/utils");
const { addServiceToUser } = require("login.dfe.api-client/users");
const { getServiceRolesRaw } = require("login.dfe.api-client/services");
const {
  getUserServiceRequestStatus,
  updateServiceRequest,
} = require("../../../../src/app/requestService/utils");
jest.mock("./../../../../src/infrastructure/organisations", () => {
  return {
    getOrganisationAndServiceForUser: jest.fn(),
  };
});
const {
  getOrganisationAndServiceForUser,
} = require("./../../../../src/infrastructure/organisations");
const PolicyEngine = require("login.dfe.policy-engine");
const { NotificationClient } = require("login.dfe.jobs-client");
const logger = require("../../../../src/infrastructure/logger");

jest.mock("login.dfe.policy-engine");
jest.mock("login.dfe.jobs-client");
jest.mock("../../../../src/app/users/utils");
jest.mock("../../../../src/infrastructure/logger", () =>
  require("../../../utils/jestMocks").mockLogger(),
);
jest.mock("login.dfe.api-client/users", () => {
  return {
    updateUserServiceRoles: jest.fn(),
    addServiceToUser: jest.fn(),
  };
});
jest.mock("login.dfe.api-client/services", () => {
  return {
    getServiceRolesRaw: jest.fn(),
  };
});
jest.mock("../../../../src/app/requestService/utils", () => {
  return {
    getUserServiceRequestStatus: jest.fn(),
    updateServiceRequest: jest.fn(),
  };
});
jest.mock("../../../../src/infrastructure/helpers/allServicesAppCache", () => {
  return {
    checkCacheForAllServices: jest.fn(),
  };
});
jest.mock("../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});
jest.mock("login.dfe.dao", () => {
  return {
    services: {
      getUserServiceRequest: jest.fn(),
    },
  };
});

const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
  validate: jest.fn(),
};

const sendServiceRequestApproved = jest.fn();
const sendServiceRequestOutcomeToApprovers = jest.fn();
NotificationClient.mockImplementation(() => {
  return {
    sendServiceRequestApproved,
    sendServiceRequestOutcomeToApprovers,
  };
});

describe("When approving a service request", () => {
  let req;
  let res;

  let postApproveServiceRequest;

  beforeEach(() => {
    req = mockRequest();

    ((req.params = {
      orgId: "organisationId",
      uid: "endUser1",
      sid: "service1",
      rids: '["role1"]',
      reqID: "sub-service-req-ID",
    }),
      (req.session = {
        user: {
          email: "john.doe@email.com",
          firstName: "John",
          lastName: "Doe",
        },
        service: {
          roles: ["role1"],
        },
      }));

    req.user = {
      uid: "approver1",
      sub: "approver1",
      email: "approver.one@unit.test",
      organisations: [
        {
          organisation: {
            id: "organisationId",
            name: "organisationName",
          },
          role: {
            id: 10000,
            name: "Approver",
          },
        },
      ],
    };
    req.query.reqId = "reqId";
    req.userOrganisations = [
      {
        organisation: {
          id: "organisationId",
          name: "organisationName",
        },
        role: {
          id: 10000,
          name: "Approver",
        },
      },
    ];
    res = mockResponse();

    getUserDetails.mockReset().mockReturnValue({
      id: "user1",
      email: "john.doe@email.com",
      firstName: "John",
      lastName: "Doe",
    });

    policyEngine.validate.mockReset().mockReturnValue([]);
    policyEngine.getPolicyApplicationResultsForUser
      .mockReset()
      .mockReturnValue([
        {
          id: "service1",
          rolesAvailableToUser: ["role1"],
        },
      ]);
    PolicyEngine.mockReset().mockImplementation(() => policyEngine);

    getOrganisationAndServiceForUser.mockReset().mockReturnValue([
      {
        organisation: {
          id: "organisationId",
          name: "Great Big School",
        },
        role: {
          id: 0,
          name: "End user",
        },
      },
    ]);

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

    checkCacheForAllServices.mockReset().mockReturnValue({
      services: [
        {
          id: "service1",
          name: "service name",
        },
        {
          id: "service2",
          name: "service2 name",
        },
      ],
    });

    getUserServiceRequestStatus.mockReset().mockReturnValue(0);

    updateServiceRequest.mockReset().mockReturnValue({
      success: true,
      serviceRequest: {
        status: 1,
      },
    });

    postApproveServiceRequest =
      require("../../../../src/app/requestService/approveServiceRequest").post;

    sendServiceRequestApproved.mockReset();
    sendServiceRequestOutcomeToApprovers.mockReset();
  });

  it("then should redirect to `my services` page if there is no user in session", async () => {
    req.session.user = undefined;
    await postApproveServiceRequest(req, res);
    expect(addServiceToUser).toHaveBeenCalledTimes(0);
    expect(res.redirect.mock.calls).toHaveLength(1);
  });

  it("then it should get all the end-user details", async () => {
    await postApproveServiceRequest(req, res);

    expect(getUserDetails.mock.calls).toHaveLength(1);
    expect(getUserDetails.mock.calls[0][0]).toBe(req);
  });

  it("then it should list all roles of service", async () => {
    await postApproveServiceRequest(req, res);

    expect(checkCacheForAllServices.mock.calls).toHaveLength(1);

    expect(getServiceRolesRaw.mock.calls).toHaveLength(1);
    expect(getServiceRolesRaw.mock.calls[0][0]).toMatchObject({
      serviceId: "service1",
    });
  });

  it("then it should render `approveRolesRequest` view with error if there are validation messages in the viewModel", async () => {
    req.session.user.serviceId = "service1";
    req.params.sid = "service2";

    await postApproveServiceRequest(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      `requestService/views/approveServiceRequest`,
    );
    expect(res.render.mock.calls[0][1]).toMatchObject({
      validationMessages: {
        messages: "Service not valid - please change service",
      },
    });
  });

  it("then it should return the `requestAlreadyApproved` view if the request is already approved", async () => {
    req.query.reqId = "reqId";
    updateServiceRequest.mockReset();
    updateServiceRequest.mockReturnValue({
      success: false,
      serviceRequest: {
        status: 1,
      },
    });
    await postApproveServiceRequest(req, res);
    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestService/views/requestAlreadyApproved",
    );
  });

  it("then it should return the `requestAlreadyRejected` view if the request is already rejected", async () => {
    req.query.reqId = "reqId";
    updateServiceRequest.mockReset();
    updateServiceRequest.mockReturnValue({
      success: false,
      serviceRequest: {
        status: -1,
      },
    });
    await postApproveServiceRequest(req, res);
    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestService/views/requestAlreadyRejected",
    );
  });

  it("then it should send an email notification", async () => {
    await postApproveServiceRequest(req, res);

    expect(sendServiceRequestApproved.mock.calls).toHaveLength(1);
    expect(sendServiceRequestApproved.mock.calls[0][0]).toBe(
      "john.doe@email.com",
    );
    expect(sendServiceRequestApproved.mock.calls[0][1]).toBe("John");
    expect(sendServiceRequestApproved.mock.calls[0][2]).toBe("Doe");
    expect(sendServiceRequestApproved.mock.calls[0][3]).toBe(
      "organisationName",
    );
    expect(sendServiceRequestApproved.mock.calls[0][4]).toBe("service name");
    expect(sendServiceRequestApproved.mock.calls[0][5]).toStrictEqual([
      "role_name",
    ]);
    expect(sendServiceRequestApproved.mock.calls[0][6]).toEqual({
      id: 0,
      name: "End user",
    });

    expect(sendServiceRequestOutcomeToApprovers.mock.calls).toHaveLength(1);
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][0]).toBe(
      "approver1",
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][1]).toBe(
      "john.doe@email.com",
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][2]).toBe(
      "John Doe",
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
      ["role_name"],
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][7]).toBe(true);
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][8]).toBe(null);
  });

  it("then it should should audit the approval", async () => {
    await postApproveServiceRequest(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      'approver.one@unit.test (approverId: approver1) approved service (serviceId: service1) and roles (roleIds: ["role1"]) and organisation (orgId: organisationId) for end user (endUserId: endUser1) - requestId (reqId: reqId)',
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      type: "services",
      subType: "access-request",
      userId: "approver1",
      userEmail: "approver.one@unit.test",
    });
  });

  it("then a flash message is shown to the user", async () => {
    await postApproveServiceRequest(req, res);

    expect(res.flash.mock.calls).toHaveLength(3);
    expect(res.flash.mock.calls[0][0]).toBe("title");
    expect(res.flash.mock.calls[0][1]).toBe("Success");
    expect(res.flash.mock.calls[1][0]).toBe("heading");
    expect(res.flash.mock.calls[1][1]).toBe("Service request approved");
    expect(res.flash.mock.calls[2][0]).toBe("message");
    expect(res.flash.mock.calls[2][1]).toBe(
      "The user who raised the request will receive an email to tell them their service access request was approved.",
    );
  });

  it("then it should render `approveServiceRequest` view with error if there are validation messages", async () => {
    policyEngine.validate.mockReturnValue([
      { message: "There has been an error" },
    ]);

    await postApproveServiceRequest(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      `requestService/views/approveServiceRequest`,
    );
    expect(res.render.mock.calls[0][1]).toMatchObject({
      validationMessages: {
        messages: ["There has been an error"],
      },
    });
  });

  it("then it should redirect the approver to `my-services` page", async () => {
    await postApproveServiceRequest(req, res);
    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/my-services");
  });
});
