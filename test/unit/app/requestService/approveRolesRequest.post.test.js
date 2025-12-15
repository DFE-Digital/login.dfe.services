const {
  mockRequest,
  mockResponse,
  mockAdapterConfig,
} = require("../../../utils/jestMocks");
const {
  checkCacheForAllServices,
} = require("../../../../src/infrastructure/helpers/allServicesAppCache");
const { getUserDetails } = require("../../../../src/app/users/utils");
const { updateUserServiceRoles } = require("login.dfe.api-client/users");
const { getServiceRolesRaw } = require("login.dfe.api-client/services");
const {
  isServiceEmailNotificationAllowed,
} = require("../../../../src/infrastructure/applications");
const {
  createSubServiceAddedBanners,
} = require("../../../../src/app/home/userBannersHandlers");
const {
  getUserServiceRequestStatus,
  updateServiceRequest,
} = require("../../../../src/app/requestService/utils");
const {
  getOrganisationPermissionLevel,
} = require("../../../../src/app/accessRequests/utils");
const PolicyEngine = require("login.dfe.policy-engine");
const { NotificationClient } = require("login.dfe.jobs-client");
const logger = require("./../../../../src/infrastructure/logger");

jest.mock("login.dfe.policy-engine");
jest.mock("login.dfe.jobs-client");
jest.mock("../../../../src/app/users/utils");
jest.mock("../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);
jest.mock("login.dfe.api-client/users", () => {
  return {
    updateUserServiceRoles: jest.fn(),
  };
});
jest.mock("login.dfe.api-client/services", () => {
  return {
    getServiceRolesRaw: jest.fn(),
  };
});
jest.mock("../../../../src/app/home/userBannersHandlers", () => {
  return { createSubServiceAddedBanners: jest.fn() };
});
jest.mock("../../../../src/infrastructure/applications", () => {
  return { isServiceEmailNotificationAllowed: jest.fn() };
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
jest.mock("../../../../src/app/accessRequests/utils", () => ({
  getOrganisationPermissionLevel: jest.fn(),
}));

const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
  validate: jest.fn(),
};

const sendSubServiceRequestApproved = jest.fn();
const sendSubServiceRequestOutcomeToApprovers = jest.fn();

describe("When approving a sub service request", () => {
  let req;
  let res;

  let postApproveRolesRequest;

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
      ],
    });

    getUserServiceRequestStatus.mockReset().mockReturnValue(0);

    updateServiceRequest.mockReset().mockReturnValue({
      success: true,
      serviceRequest: {
        status: 1,
      },
    });

    getOrganisationPermissionLevel.mockReset().mockReturnValue({
      id: 0,
      name: "End user",
    });

    postApproveRolesRequest =
      require("../../../../src/app/requestService/approveRolesRequest").post;
    sendSubServiceRequestApproved.mockReset();
    sendSubServiceRequestOutcomeToApprovers.mockReset();
    NotificationClient.mockReset().mockImplementation(() => ({
      sendSubServiceRequestApproved,
      sendSubServiceRequestOutcomeToApprovers,
    }));
  });
  it("then should redirect to `my services` page if there is no user in session", async () => {
    req.session.user = undefined;
    await postApproveRolesRequest(req, res);
    expect(res.redirect.mock.calls).toHaveLength(1);
  });

  it("then it should get all the end-user details", async () => {
    await postApproveRolesRequest(req, res);

    expect(getUserDetails.mock.calls).toHaveLength(1);
    expect(getUserDetails.mock.calls[0][0]).toBe(req);
  });

  it("then it should get all services", async () => {
    await postApproveRolesRequest(req, res);

    expect(checkCacheForAllServices.mock.calls).toHaveLength(1);
  });

  it("then it should list all roles of service", async () => {
    await postApproveRolesRequest(req, res);

    expect(getServiceRolesRaw.mock.calls).toHaveLength(1);
    expect(getServiceRolesRaw.mock.calls[0][0]).toMatchObject({
      serviceId: "service1",
    });
  });

  it("then it should update the sub-service-request in the DB", async () => {
    await postApproveRolesRequest(req, res);

    expect(updateServiceRequest.mock.calls).toHaveLength(1);
    expect(updateServiceRequest.mock.calls[0][0]).toBe("sub-service-req-ID");
    expect(updateServiceRequest.mock.calls[0][1]).toBe(1);
    expect(updateServiceRequest.mock.calls[0][2]).toBe("approver1");
  });

  it("then it should return the `requestAlreadyApproved` view if the request is already approved", async () => {
    updateServiceRequest.mockReset();
    updateServiceRequest.mockReturnValue({
      success: false,
      serviceRequest: {
        status: 1,
      },
    });
    await postApproveRolesRequest(req, res);
    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestService/views/requestAlreadyApproved",
    );
  });

  it("then it should return the `requestAlreadyRejected` view if the request is already rejected", async () => {
    updateServiceRequest.mockReset();
    updateServiceRequest.mockReturnValue({
      success: false,
      serviceRequest: {
        status: -1,
      },
    });
    await postApproveRolesRequest(req, res);
    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestService/views/requestAlreadyRejected",
    );
  });

  it("then it should update the end user service with the new roles", async () => {
    await postApproveRolesRequest(req, res);

    expect(updateUserServiceRoles.mock.calls).toHaveLength(1);
    expect(updateUserServiceRoles).toBeCalledWith({
      userId: "endUser1",
      serviceId: "service1",
      organisationId: "organisationId",
      serviceRoleIds: ["role1"],
    });
  });

  it("then it should check if email notification is allowed for service", async () => {
    await postApproveRolesRequest(req, res);

    expect(isServiceEmailNotificationAllowed.mock.calls).toHaveLength(1);
  });

  it("then it should check the user organisation permission if email notification is allowed for service", async () => {
    isServiceEmailNotificationAllowed.mockReset().mockReturnValue(true);
    await postApproveRolesRequest(req, res);

    expect(getOrganisationPermissionLevel.mock.calls).toHaveLength(1);
    expect(getOrganisationPermissionLevel.mock.calls[0][0]).toBe("endUser1");
    expect(getOrganisationPermissionLevel.mock.calls[0][1]).toBe(
      "organisationId",
    );
    expect(getOrganisationPermissionLevel.mock.calls[0][2]).toBe(
      "correlationId",
    );
  });

  it("then it should not check the user organisation permission if email notification is not allowed for service", async () => {
    isServiceEmailNotificationAllowed.mockReset().mockReturnValue(false);
    await postApproveRolesRequest(req, res);

    expect(getOrganisationPermissionLevel.mock.calls).toHaveLength(0);
  });

  it("then it should send an email notification if notifications are allowed", async () => {
    isServiceEmailNotificationAllowed.mockReset().mockReturnValue(true);
    await postApproveRolesRequest(req, res);

    expect(sendSubServiceRequestApproved.mock.calls).toHaveLength(1);
    expect(sendSubServiceRequestApproved.mock.calls[0][0]).toBe(
      "john.doe@email.com",
    );
    expect(sendSubServiceRequestApproved.mock.calls[0][1]).toBe("John");
    expect(sendSubServiceRequestApproved.mock.calls[0][2]).toBe("Doe");
    expect(sendSubServiceRequestApproved.mock.calls[0][3]).toBe(
      "organisationName",
    );
    expect(sendSubServiceRequestApproved.mock.calls[0][4]).toBe("service name");
    expect(sendSubServiceRequestApproved.mock.calls[0][5]).toStrictEqual([
      "role_name",
    ]);
    expect(sendSubServiceRequestApproved.mock.calls[0][6]).toEqual({
      id: 0,
      name: "End user",
    });

    expect(sendSubServiceRequestOutcomeToApprovers.mock.calls).toHaveLength(1);
    expect(sendSubServiceRequestOutcomeToApprovers.mock.calls[0][0]).toBe(
      "approver1",
    );
    expect(sendSubServiceRequestOutcomeToApprovers.mock.calls[0][1]).toBe(
      "john.doe@email.com",
    );
    expect(sendSubServiceRequestOutcomeToApprovers.mock.calls[0][2]).toBe(
      "John Doe",
    );
    expect(sendSubServiceRequestOutcomeToApprovers.mock.calls[0][3]).toBe(
      "organisationId",
    );
    expect(sendSubServiceRequestOutcomeToApprovers.mock.calls[0][4]).toBe(
      "organisationName",
    );
    expect(sendSubServiceRequestOutcomeToApprovers.mock.calls[0][5]).toBe(
      "service name",
    );
    expect(
      sendSubServiceRequestOutcomeToApprovers.mock.calls[0][6],
    ).toStrictEqual(["role_name"]);
    expect(sendSubServiceRequestOutcomeToApprovers.mock.calls[0][7]).toBe(true);
    expect(sendSubServiceRequestOutcomeToApprovers.mock.calls[0][8]).toBe(null);
  });

  it("then it should not send an email notification if notifications are not allowed", async () => {
    isServiceEmailNotificationAllowed.mockReset().mockReturnValue(false);
    await postApproveRolesRequest(req, res);

    expect(sendSubServiceRequestApproved.mock.calls).toHaveLength(0);
  });

  it("then it should should audit the approval", async () => {
    await postApproveRolesRequest(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      'approver.one@unit.test (approverId: approver1) approved sub-service request for (serviceId: service1) and sub-services (roleIds: ["role1"]) and organisation (orgId: organisationId) for end user (endUserId: endUser1) - requestId (reqId: sub-service-req-ID)',
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      type: "sub-service",
      subType: "sub-service request Approved",
      userId: "approver1",
      userEmail: "approver.one@unit.test",
    });
  });

  it('then it should create "Sub-service added" banner', async () => {
    await postApproveRolesRequest(req, res);

    expect(createSubServiceAddedBanners.mock.calls).toHaveLength(1);
    expect(createSubServiceAddedBanners.mock.calls[0][0]).toBe("endUser1");
    expect(createSubServiceAddedBanners.mock.calls[0][1]).toBe("service name");
    expect(createSubServiceAddedBanners.mock.calls[0][2]).toStrictEqual([
      "role_name",
    ]);
  });

  it("then a flash message is shown to the user", async () => {
    await postApproveRolesRequest(req, res);

    expect(res.flash.mock.calls).toHaveLength(3);
    expect(res.flash.mock.calls[0][0]).toBe("title");
    expect(res.flash.mock.calls[0][1]).toBe("Success");
    expect(res.flash.mock.calls[1][0]).toBe("heading");
    expect(res.flash.mock.calls[1][1]).toBe("Sub-service changes approved");
    expect(res.flash.mock.calls[2][0]).toBe("message");
    expect(res.flash.mock.calls[2][1]).toBe(
      "John Doe will receive an email to tell them their sub-service access has changed.",
    );
  });

  it("then it should render `approveRolesRequest` view with error if there are validation messages in the viewModel", async () => {
    policyEngine.validate.mockReturnValue([
      { message: "There has been an error" },
    ]);

    await postApproveRolesRequest(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      `requestService/views/approveRolesRequest`,
    );
    expect(res.render.mock.calls[0][1]).toMatchObject({
      validationMessages: {
        messages: ["There has been an error"],
      },
    });
  });

  it("then it should render `approveRolesRequest` view with error if there are validation messages", async () => {
    policyEngine.validate.mockReturnValue([
      { message: "There has been an error" },
    ]);

    await postApproveRolesRequest(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      `requestService/views/approveRolesRequest`,
    );
    expect(res.render.mock.calls[0][1]).toMatchObject({
      validationMessages: {
        messages: ["There has been an error"],
      },
    });
  });

  it("then it should redirect the approver to `my-services` page", async () => {
    await postApproveRolesRequest(req, res);
    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/my-services");
  });
});
