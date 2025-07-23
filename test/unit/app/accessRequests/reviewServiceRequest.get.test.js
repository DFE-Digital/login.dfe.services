const { getServiceRolesRaw } = require("login.dfe.api-client/services");
const { mockRequest, mockResponse } = require("../../../utils/jestMocks");
const {
  getAndMapServiceRequest,
  generateFlashMessages,
} = require("../../../../src/app/accessRequests/utils");
const {
  get,
} = require("../../../../src/app/accessRequests/reviewServiceRequest");
const PolicyEngine = require("login.dfe.policy-engine");

jest.mock("../../../../src/infrastructure/config", () =>
  require("../../../utils/jestMocks").mockConfig(),
);
jest.mock("../../../../src/infrastructure/logger", () =>
  require("../../../utils/jestMocks").mockLogger(),
);
jest.mock("login.dfe.dao", () => require("../../../utils/jestMocks").mockDao());
jest.mock("../../../../src/app/accessRequests/utils");
jest.mock("login.dfe.policy-engine");
jest.mock("../../../../src/infrastructure/access", () => {
  return {
    updateUserService: jest.fn(),
  };
});

jest.mock("login.dfe.api-client/services", () => {
  return {
    getServiceRolesRaw: jest.fn(),
  };
});

const res = mockResponse();

describe("when reviewing a service request", () => {
  let req;
  const policyEngine = {
    getPolicyApplicationResultsForUser: jest.fn(),
    validate: jest.fn(),
  };
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
    generateFlashMessages.mockReset().mockReturnValue({
      title: "Important",
      heading: "Service request already approved: Test service",
      message:
        "jane.doe@education has already responded to the service request.<br>John Doe has received an email to tell them their request has been approved. No further action is needed.",
    });

    policyEngine.validate.mockReset().mockReturnValue([]);
    policyEngine.getPolicyApplicationResultsForUser
      .mockReset()
      .mockReturnValue({
        rolesAvailableToUser: ["role-id-1"],
      });
    PolicyEngine.mockReset().mockImplementation(() => policyEngine);

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
    res.mockResetAll();
  });

  it("then it should get the mapped service request", async () => {
    await get(req, res);

    expect(getAndMapServiceRequest.mock.calls).toHaveLength(1);
    expect(getAndMapServiceRequest.mock.calls[0][0]).toBe(req.params.rid);
  });

  it("then should list all the services roles", async () => {
    await get(req, res);

    expect(getServiceRolesRaw.mock.calls).toHaveLength(1);
    expect(getServiceRolesRaw.mock.calls[0][0]).toMatchObject({
      serviceId: req.params.sid,
    });
  });

  it("then it should display the review service request view", async () => {
    await get(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/reviewServiceRequest",
    );
  });

  it("then it should include csrf token", async () => {
    await get(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
    });
  });

  it("then it should include the request details", async () => {
    await get(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      request: {
        endUsersGivenName: "John",
        endUsersFamilyName: "Doe",
        endUsersEmail: "john.doe@education.co.uk",
        organisation: { id: "organisation-id", name: "Test Organisation" },
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
        },
      },
    });
  });

  it("then it should include the page title and the current page", async () => {
    await get(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      title: "Review service request - DfE Sign-in",
      currentPage: "requests",
    });
  });

  it("then it should include the amend service url", async () => {
    await get(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      serviceAmendUrl:
        "/approvals/organisation-id/users/end-user-id/associate-services?action=review-service-req-amend-service",
    });
  });

  it("then it should include the amend roles url", async () => {
    await get(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      subServiceAmendUrl:
        "/approvals/organisation-id/users/end-user-id/associate-services/service-id?action=review-service-req-amend-role",
    });
  });

  it("then it should redirect to requests page and display a flash message if service request already actioned", async () => {
    getAndMapServiceRequest.mockReset().mockReturnValue({
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
    });
    await get(req, res);
    expect(generateFlashMessages.mock.calls).toHaveLength(1);
    expect(generateFlashMessages.mock.calls[0][0]).toBe("service");
    expect(generateFlashMessages.mock.calls[0][1]).toBe(1);
    expect(generateFlashMessages.mock.calls[0][2]).toBe("jane.doe@education");
    expect(generateFlashMessages.mock.calls[0][3]).toBe("John");
    expect(generateFlashMessages.mock.calls[0][4]).toBe("Doe");
    expect(generateFlashMessages.mock.calls[0][5]).toBe("Test Service");
    expect(res.redirect.mock.calls[0][0]).toBe(`/access-requests/requests`);
  });
});
