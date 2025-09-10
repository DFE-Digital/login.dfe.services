const { addServiceToUser } = require("login.dfe.api-client/users");
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
} = require("../../../../src/app/accessRequests/reviewServiceRequest");
const {
  getUserServiceRequestStatus,
  updateServiceRequest,
} = require("../../../../src/app/requestService/utils");
const PolicyEngine = require("login.dfe.policy-engine");
const { NotificationClient } = require("login.dfe.jobs-client");
const logger = require("./../../../../src/infrastructure/logger");
const {
  createUserBanners,
} = require("../../../../src/app/home/userBannersHandlers");

jest.mock("login.dfe.policy-engine");
jest.mock("login.dfe.jobs-client");

jest.mock("../../../../src/infrastructure/logger", () => mockLogger());

jest.mock("../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});

jest.mock("login.dfe.dao", () => require("../../../utils/jestMocks").mockDao());
jest.mock("../../../../src/app/accessRequests/utils");

jest.mock("login.dfe.api-client/users", () => {
  return {
    addServiceToUser: jest.fn(),
  };
});
jest.mock("login.dfe.api-client/services", () => {
  return {
    getServiceRolesRaw: jest.fn(),
  };
});
jest.mock("../../../../src/app/home/userBannersHandlers", () => {
  return { createUserBanners: jest.fn() };
});
jest.mock("../../../../src/app/requestService/utils", () => {
  return {
    getUserServiceRequestStatus: jest.fn(),
    updateServiceRequest: jest.fn(),
  };
});

const sendServiceRequestApproved = jest.fn();
const sendServiceRequestOutcomeToApprovers = jest.fn();

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
      body: { selectedResponse: "approve}" },
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

    NotificationClient.mockImplementation(() => {
      return {
        sendServiceRequestApproved,
        sendServiceRequestOutcomeToApprovers,
      };
    });
  });

  it("then it should render error message if no response selected", async () => {
    req.body.selectedResponse = null;
    req.params.rid = 1;

    await post(req, res);

    expect(addServiceToUser).toHaveBeenCalledTimes(0);
    expect(updateServiceRequest).toHaveBeenCalledTimes(0);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/reviewServiceRequest",
    );
    expect(res.render.mock.calls[0][1]).toMatchObject({
      validationMessages: {
        selectedResponse: "Approve or Reject must be selected",
      },
    });
  });

  it("then it should redirect to requests page and display a flash message if service request already actioned", async () => {
    req.body.selectedResponse = "reject";
    getAndMapServiceRequest.mockReset().mockReturnValue(approvedReqMock);
    await post(req, res);
    expect(generateFlashMessages.mock.calls).toHaveLength(1);
    expect(generateFlashMessages.mock.calls[0][0]).toBe("service");
    expect(generateFlashMessages.mock.calls[0][1]).toBe(1);
    expect(generateFlashMessages.mock.calls[0][2]).toBe("jane.doe@education");
    expect(generateFlashMessages.mock.calls[0][3]).toBe("John");
    expect(generateFlashMessages.mock.calls[0][4]).toBe("Doe");
    expect(generateFlashMessages.mock.calls[0][5]).toBe("Test Service");
    expect(res.redirect.mock.calls[0][0]).toBe(`/access-requests/requests`);
  });

  it("then it should redirect to rejection page if reject", async () => {
    req.body.selectedResponse = "reject";
    await post(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(
      "/access-requests/service-requests/request-id/services/service-id/roles/role-id-1/rejected",
    );
  });

  it("then it should update the service request status to approved", async () => {
    await post(req, res);
    expect(createUserBanners.mock.calls).toHaveLength(1);
    expect(createUserBanners.mock.calls[0][0]).toBe("end-user-id");
    expect(updateServiceRequest.mock.calls).toHaveLength(1);
    expect(updateServiceRequest.mock.calls[0][0]).toBe("request-id");
    expect(updateServiceRequest.mock.calls[0][1]).toBe(1);
    expect(updateServiceRequest.mock.calls[0][2]).toBe("approver-user-id");
    expect(updateServiceRequest.mock.calls[0][3]).toBe(undefined);

    expect(sendServiceRequestApproved.mock.calls).toHaveLength(1);
    expect(sendServiceRequestApproved.mock.calls[0][0]).toBe(
      "john.doe@education.co.uk",
    );
    expect(sendServiceRequestApproved.mock.calls[0][1]).toBe("John");
    expect(sendServiceRequestApproved.mock.calls[0][2]).toBe("Doe");
    expect(sendServiceRequestApproved.mock.calls[0][3]).toBe(
      "Test Organisation",
    );
    expect(sendServiceRequestApproved.mock.calls[0][4]).toBe("Test Service");
    expect(sendServiceRequestApproved.mock.calls[0][5]).toStrictEqual([
      "Test role one",
    ]);

    expect(sendServiceRequestOutcomeToApprovers.mock.calls).toHaveLength(1);
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][0]).toBe(
      "approver-user-id",
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][1]).toBe(
      "john.doe@education.co.uk",
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][2]).toBe(
      "John Doe",
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][3]).toBe(
      "organisation-id",
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][4]).toBe(
      "Test Organisation",
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][5]).toBe(
      "Test Service",
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][6]).toStrictEqual(
      ["Test role one"],
    );
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][7]).toBe(true);
    expect(sendServiceRequestOutcomeToApprovers.mock.calls[0][8]).toBe(null);
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

  it("then it should map user to service and selected sub-services", async () => {
    await post(req, res);
    expect(addServiceToUser).toHaveBeenCalledTimes(1);
    expect(addServiceToUser).toHaveBeenCalledWith({
      userId: "end-user-id",
      serviceId: "service-id",
      organisationId: "organisation-id",
      serviceRoleIds: ["role-id-1"],
    });
  });

  it("then it should send the audit logs for service request approved", async () => {
    await post(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      'jane.doe@education (approverId: approver-user-id) approved service (serviceId: service-id) and roles (roleIds: ["role-id-1"]) and organisation (orgId: organisation-id) for end user (endUserId: end-user-id) - requestId (reqId: request-id)',
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      subType: "access-request-approved",
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
    expect(res.flash.mock.calls[1][1]).toBe("Service access request approved");
    expect(res.flash.mock.calls[2][0]).toBe("message");
    expect(res.flash.mock.calls[2][1]).toBe(
      "John Doe has been added to Test Service.",
    );

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/access-requests/requests");
  });
});
