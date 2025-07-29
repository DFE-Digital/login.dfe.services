const { getServiceRolesRaw } = require("login.dfe.api-client/services");
const {
  mockRequest,
  mockResponse,
  mockAdapterConfig,
  mockLogger,
} = require("../../../utils/jestMocks");
const {
  getAndMapServiceRequest,
  generateFlashMessages,
} = require("../../../../src/app/accessRequests/utils");
const {
  post,
} = require("../../../../src/app/accessRequests/rejectServiceRequest");
const {
  getUserServiceRequestStatus,
  updateServiceRequest,
} = require("../../../../src/app/requestService/utils");
const PolicyEngine = require("login.dfe.policy-engine");

const logger = require("./../../../../src/infrastructure/logger");

const { NotificationClient } = require("login.dfe.jobs-client");
const sendServiceRequestRejected = jest.fn();
NotificationClient.mockImplementation(() => {
  return {
    sendServiceRequestRejected,
  };
});

jest.mock("login.dfe.policy-engine");
jest.mock("login.dfe.jobs-client");

jest.mock("../../../../src/infrastructure/logger", () => mockLogger());

jest.mock("../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});

jest.mock("login.dfe.dao", () => require("../../../utils/jestMocks").mockDao());
jest.mock("../../../../src/app/accessRequests/utils");

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

const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
  validate: jest.fn(),
};

const approvedReqMock = {
  endUsersGivenName: "John",
  endUsersFamilyName: "Doe",
  endUsersEmail: "john.doe@education.co.uk",
  approverName: "Jane Doe",
  approverEmail: "jane.doe@education",
  organisation: {
    id: "organisation-id",
    name: "Test Organisation",
  },
  dataValues: {
    id: "request-id",
    user_id: "end-user-id",
    service_id: "service-id",
    role_ids: "role-id-1",
    organisation_id: "organisation-id",
    request_type: "service",
    status: 1,
    reason: null,
    actioned_by: "approver-user-id",
    actioned_reason: "Approve",
    actioned_at: null,
    createdAt: "2023-05-22T13:52:48.944Z",
    updatedAt: "2023-05-24T13:52:48.944Z",
  },
};

const rejectedReqMock = {
  endUsersGivenName: "John",
  endUsersFamilyName: "Doe",
  endUsersEmail: "john.doe@education.co.uk",
  approverName: "Jane Doe",
  approverEmail: "jane.doe@education",
  organisation: {
    id: "organisation-id",
    name: "Test Organisation",
  },
  dataValues: {
    id: "request-id",
    user_id: "end-user-id",
    service_id: "service-id",
    role_ids: "role-id-1",
    organisation_id: "organisation-id",
    request_type: "service",
    status: -1,
    reason: "Rejection reason",
    actioned_by: "approver-user-id",
    actioned_reason: "Reject",
    actioned_at: null,
    createdAt: "2023-05-22T13:52:48.944Z",
    updatedAt: "2023-05-24T13:52:48.944Z",
  },
};

describe("when reviewing a service request", () => {
  let req;
  let res;
  beforeEach(() => {
    req = mockRequest({
      user: {
        sub: "approver-user-id",
        given_name: "Jane",
        family_name: "Doe",
        email: "jane.doe@education",
      },
      params: {
        rid: "request-id",
        orgId: "organisation-id",
        uid: "end-user-id",
        sid: "service-id",
        rolesIds: "role-id-1",
      },
      body: { reason: "Rejection reason" },
    });

    res = mockResponse();

    generateFlashMessages.mockReset().mockReturnValue({
      title: "Important",
      heading: "Service request already approved: Test service",
      message:
        "jane.doe@education has already responded to the service request.<br>John Doe has received an email to tell them their request has been approved. No further action is needed.",
    });

    getUserServiceRequestStatus.mockReset().mockReturnValue(0);

    updateServiceRequest.mockReset().mockReturnValue({
      success: true,
      serviceRequest: {
        status: 1,
      },
    });

    getAndMapServiceRequest.mockReset().mockReturnValue({
      endUsersGivenName: "John",
      endUsersFamilyName: "Doe",
      endUsersEmail: "john.doe@education.co.uk",
      approverName: "",
      approverEmail: "",
      organisation: {
        id: "organisation-id",
        name: "Test Organisation",
      },
      dataValues: {
        id: "request-id",
        user_id: "end-user-id",
        service_id: "service-id",
        role_ids: "role-id-1",
        organisation_id: "organisation-id",
        request_type: "service",
        status: 0,
        reason: null,
        actioned_by: null,
        actioned_reason: "Pending",
        actioned_at: null,
        createdAt: "2023-05-22T13:52:48.944Z",
        updatedAt: "2023-05-22T13:52:48.944Z",
      },
    });

    getServiceRolesRaw.mockReset().mockReturnValue([
      {
        id: "role-id-1",
        name: "Test role one",
      },
      {
        id: "role-id-2",
        name: "Test role two",
      },
    ]);
    policyEngine.validate.mockReset().mockReturnValue([]);
    policyEngine.getPolicyApplicationResultsForUser
      .mockReset()
      .mockReturnValue({
        rolesAvailableToUser: ["role1-id-1"],
      });
    PolicyEngine.mockReset().mockImplementation(() => policyEngine);

    sendServiceRequestRejected.mockReset();
    NotificationClient.mockImplementation(() => {
      return {
        sendServiceRequestRejected,
      };
    });
  });

  it("then it should render error view if rejection reason is to long", async () => {
    req.body.reason = "X".repeat(1001);

    await post(req, res);

    expect(updateServiceRequest.mock.calls).toHaveLength(0);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/rejectServiceRequest",
    );
    expect(res.render.mock.calls[0][1]).toMatchObject({
      validationMessages: {
        reason: "Reason cannot be longer than 1000 characters",
      },
    });
  });

  it("then it should render error view if rejection reason has been provided with empty spaces", async () => {
    req.body.reason = "   ";

    await post(req, res);

    expect(updateServiceRequest.mock.calls).toHaveLength(0);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/rejectServiceRequest",
    );
    expect(res.render.mock.calls[0][1]).toMatchObject({
      validationMessages: {
        reason: "Enter a reason for rejection",
      },
    });
  });

  it("then it should render error view if rejection reason has not been provided", async () => {
    req.body.reason = "";

    await post(req, res);

    expect(updateServiceRequest.mock.calls).toHaveLength(0);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/rejectServiceRequest",
    );
    expect(res.render.mock.calls[0][1]).toMatchObject({
      validationMessages: {
        reason: "Enter a reason for rejection",
      },
    });
  });

  it("then it should render error view if rejection reason is null", async () => {
    req.body.reason = null;

    await post(req, res);

    expect(updateServiceRequest.mock.calls).toHaveLength(0);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/rejectServiceRequest",
    );
    expect(res.render.mock.calls[0][1]).toMatchObject({
      validationMessages: {
        reason: "Enter a reason for rejection",
      },
    });
  });

  it("then should list all the services roles", async () => {
    await post(req, res);

    expect(getServiceRolesRaw.mock.calls).toHaveLength(1);
    expect(getServiceRolesRaw.mock.calls[0][0]).toMatchObject({
      serviceId: req.params.sid,
    });
  });

  it("then it should update the service request status to rejected and rejection reason", async () => {
    await post(req, res);

    expect(updateServiceRequest.mock.calls).toHaveLength(1);
    expect(updateServiceRequest.mock.calls[0][0]).toBe("request-id");
    expect(updateServiceRequest.mock.calls[0][1]).toBe(-1);
    expect(updateServiceRequest.mock.calls[0][2]).toBe("approver-user-id");
    expect(updateServiceRequest.mock.calls[0][3]).toBe("Rejection reason");
  });

  it("then it should redirect to request page and generate flash message if request already approved", async () => {
    getUserServiceRequestStatus.mockReset();
    updateServiceRequest.mockReset().mockReturnValue({
      success: false,
      serviceRequest: { status: 1 },
    });

    getAndMapServiceRequest.mockReset().mockReturnValue(approvedReqMock);

    await post(req, res);
    expect(generateFlashMessages.mock.calls).toHaveLength(1);
    expect(generateFlashMessages.mock.calls[0][0]).toBe("service");
    expect(generateFlashMessages.mock.calls[0][1]).toBe(1);
    expect(generateFlashMessages.mock.calls[0][2]).toBe("jane.doe@education");
    expect(generateFlashMessages.mock.calls[0][3]).toBe("John");
    expect(generateFlashMessages.mock.calls[0][4]).toBe("Doe");
    expect(generateFlashMessages.mock.calls[0][5]).toBe("Test Service");
    expect(res.flash.mock.calls).toHaveLength(3);
    expect(res.redirect.mock.calls[0][0]).toBe(`/access-requests/requests`);
  });

  it("then it should redirect to request page and generate flash message if request already rejected", async () => {
    getUserServiceRequestStatus.mockReset();
    updateServiceRequest.mockReset().mockReturnValue({
      success: false,
      serviceRequest: { status: -1 },
    });

    getAndMapServiceRequest.mockReset().mockReturnValue(rejectedReqMock);

    await post(req, res);
    expect(generateFlashMessages.mock.calls).toHaveLength(1);
    expect(generateFlashMessages.mock.calls[0][0]).toBe("service");
    expect(generateFlashMessages.mock.calls[0][1]).toBe(-1);
    expect(generateFlashMessages.mock.calls[0][2]).toBe("jane.doe@education");
    expect(generateFlashMessages.mock.calls[0][3]).toBe("John");
    expect(generateFlashMessages.mock.calls[0][4]).toBe("Doe");
    expect(generateFlashMessages.mock.calls[0][5]).toBe("Test Service");
    expect(res.redirect.mock.calls[0][0]).toBe(`/access-requests/requests`);
  });

  it("then it should send the audit logs for service request approved", async () => {
    await post(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      "jane.doe@education (approverId: approver-user-id) rejected service (serviceId: service-id), roles (roleIds: role-id-1) and organisation (orgId: organisation-id) for end user (endUserId: end-user-id). The reject reason is Rejection reason - requestId (reqId: request-id)",
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      subType: "access-request-rejected",
      type: "services",
      userEmail: "jane.doe@education",
      userId: "approver-user-id",
    });
  });

  it("then it should redirect to access request page and display a success message", async () => {
    await post(req, res);

    expect(res.flash.mock.calls).toHaveLength(3);
    expect(res.flash.mock.calls[0][0]).toBe("title");
    expect(res.flash.mock.calls[0][0]).toBe("title");
    expect(res.flash.mock.calls[0][1]).toBe("Success");
    expect(res.flash.mock.calls[1][0]).toBe("heading");
    expect(res.flash.mock.calls[1][1]).toBe("Service access request rejected");
    expect(res.flash.mock.calls[2][0]).toBe("message");
    expect(res.flash.mock.calls[2][1]).toBe(
      "John Doe cannot access Test Service.",
    );

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/access-requests/requests");
  });
});
