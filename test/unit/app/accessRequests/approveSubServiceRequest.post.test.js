const {
  mockRequest,
  mockResponse,
  mockAdapterConfig,
} = require("../../../utils/jestMocks");
const {
  getSubServiceRequestVieModel,
  getAndMapServiceRequest,
  getNewRoleDetails,
  getOrganisationPermissionLevel,
} = require("../../../../src/app/accessRequests/utils");
const {
  updateServiceRequest,
} = require("../../../../src/app/requestService/utils");
const {
  createSubServiceAddedBanners,
} = require("../../../../src/app/home/userBannersHandlers");
const {
  post,
} = require("../../../../src/app/accessRequests/reviewSubServiceRequest");
const {
  isServiceEmailNotificationAllowed,
} = require("../../../../src/infrastructure/applications");
const { NotificationClient } = require("login.dfe.jobs-client");
const sendAccessRequest = jest.fn();

const Account = require("../../../../src/infrastructure/account");
jest.mock("login.dfe.policy-engine");
jest.mock("login.dfe.jobs-client");
jest.mock("../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});
jest.mock("../../../../src/infrastructure/logger", () =>
  require("../../../utils/jestMocks").mockLogger(),
);
jest.mock("./../../../../src/infrastructure/account", () => ({
  fromContext: jest.fn(),
  getById: jest.fn(),
}));
jest.mock("../../../../src/app/home/userBannersHandlers", () => {
  return { createSubServiceAddedBanners: jest.fn() };
});
jest.mock("../../../../src/app/accessRequests/utils", () => {
  return {
    getAndMapServiceRequest: jest.fn(),
    getSubServiceRequestVieModel: jest.fn(),
    getNewRoleDetails: jest.fn(),
    getOrganisationPermissionLevel: jest.fn(),
  };
});
jest.mock("../../../../src/infrastructure/applications", () => {
  return { isServiceEmailNotificationAllowed: jest.fn() };
});

jest.mock("../../../../src/app/requestService/utils", () => {
  return {
    updateServiceRequest: jest.fn(),
  };
});

jest.mock("../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});
jest.mock("login.dfe.dao", () => {
  return {
    services: {
      getUserServiceRequest: jest.fn(),
      updateUserPendingServiceRequest: jest.fn(),
    },
  };
});
const listRoles = [
  {
    code: "ASP_School_Anon",
    id: "01379D9F-A6DF-4810-A6C4-5468CBD41E42",
    name: "ASP School Anon 1",
    numericId: "124",
  },
  {
    code: "ASP_School_Anon",
    id: "01379D9F-A6DF-4810-A6C4-5468CBD41E42",
    name: "ASP School Anon 2",
    numericId: "124",
  },
  {
    code: "ASP_School_Anon",
    id: "01379D9F-A6DF-4810-A6C4-5468CBD41E42",
    name: "ASP School Anon 3",
    numericId: "124",
  },
  {
    code: "ASP_School_Anon",
    id: "01379D9F-A6DF-4810-A6C4-5468CBD41E42",
    name: "ASP School Anon 4",
    numericId: "124",
  },
  {
    code: "ASP_School_Anon",
    id: "01379D9F-A6DF-4810-A6C4-5468CBD41E42",
    name: "ASP School Anon 5",
    numericId: "124",
  },
];
const viewModel = {
  endUsersEmail: "b@b.gov.uk",
  endUsersFamilyName: "b",
  endUsersGivenName: "b",
  org_name: "org1",
  org_id: "org1",
  user_id: "endUser1",
  role_ids: ["role1"],
  service_id: "service1",
  status: 0,
  actioned_reason: "Pending",
  actioned_by: null,
  reason: "Pending",
  csrfToken: null,
  selectedResponse: null,
  validationMessages: {
    selectedResponse: "Approve or Reject must be selected",
  },
  currentPage: "requests",
  Role_name: "role  one",
  Service_name: "service one",
  roles: listRoles,
};

const model = {
  _changed: 0,
  _options: null,
  _previousDataValues: null,
  approverEmail: "",
  approverName: "",
  dataValues: {
    id: "request1",
    actioned_by: null,
    actioned_at: null,
    actioned_reason: "Pending",
    createdAt: new Date(),
    organisation_id: "org1",
    reason: "",
    role_ids: ["role1"],
    service_id: "service1",
    status: 0,
    updatedAt: new Date(),
    user_id: "endUser1",
  },
  endUsersEmail: "b@b.gov.uk",
  endUsersFamilyName: "b",
  endUsersGvenName: "b",
  isNewRecord: false,
  organisation: { id: "org1", name: "accademic organisatioon" },
};
jest.mock("../../../../src/app/users/utils");

const sendSubServiceRequestApproved = jest.fn();

describe("When reviewing a sub-service request for approving", () => {
  let req;
  let res;

  beforeEach(() => {
    req = mockRequest({
      params: {
        rid: "sub-service-req-ID",
      },
      session: {
        user: { sub: "user1", email: "email@email.com" },
      },
      user: {
        sub: "user1",
        email: "email@email.com",
      },
      body: {
        selectedResponse: "approve",
      },
      model: {
        _changed: 0,
        _options: null,
        _previousDataValues: null,
        approverEmail: "",
        approverName: "",
        dataValues: {
          id: "request1",
          actioned_by: null,
          actioned_at: null,
          actioned_reason: "Pending",
          createdAt: new Date(),
          organisation_id: "org1",
          reason: "",
          role_ids: "role1",
          service_id: "service1",
          status: 0,
          updatedAt: new Date(),
          user_id: "endUser1",
        },
        endUsersEmail: "b@b.gov.uk",
        endUsersFamilyName: "b",
        endUsersGvenName: "b",
        isNewRecord: false,
        organisation: { id: "org1", name: "accademic organisatioon" },
      },
      viewModel: {
        endUsersEmail: "b@b.gov.uk",
        endUsersFamilyName: "b",
        endUsersGivenName: "b",
        org_name: "org1",
        org_id: "org1",
        user_id: "endUser1",
        role_ids: "role1",
        service_id: "service1",
        status: 0,
        actioned_reason: "Pending",
        actioned_by: null,
        reason: "Pending",
        csrfToken: null,
        selectedResponse: null,
        validationMessages: {
          selectedResponse: "Approve or Reject must be selected",
        },
        currentPage: "requests",
        Role_name: "role  one",
        service_name: "service one",
      },
    });

    res = mockResponse();
    sendAccessRequest.mockReset();

    Account.getById.mockReset().mockReturnValue([
      {
        claims: {
          sub: "user1",
          given_name: "User",
          family_name: "One",
          email: "user.one@unit.tests",
        },
      },
    ]);

    getOrganisationPermissionLevel.mockReset().mockReturnValue({
      id: 0,
      name: "End user",
    });

    updateServiceRequest.mockReset();
    updateServiceRequest.mockReturnValue({ success: true });

    getAndMapServiceRequest.mockReset();
    getAndMapServiceRequest.mockReturnValue(model);

    getSubServiceRequestVieModel.mockReset();
    getSubServiceRequestVieModel.mockReturnValue(viewModel);

    getNewRoleDetails.mockReset();
    getNewRoleDetails.mockReturnValue(listRoles);

    sendSubServiceRequestApproved.mockReset();
    NotificationClient.mockReset().mockImplementation(() => ({
      sendSubServiceRequestApproved,
    }));
  });

  it("then it should check if email notification is allowed for service", async () => {
    await post(req, res);

    expect(isServiceEmailNotificationAllowed.mock.calls).toHaveLength(1);
  });

  it("then it should check the user organisation permission if email notification is allowed for service", async () => {
    isServiceEmailNotificationAllowed.mockReset().mockReturnValue(true);
    await post(req, res);

    expect(getOrganisationPermissionLevel.mock.calls).toHaveLength(1);
    expect(getOrganisationPermissionLevel.mock.calls[0][0]).toBe("endUser1");
    expect(getOrganisationPermissionLevel.mock.calls[0][1]).toBe("org1");
    expect(getOrganisationPermissionLevel.mock.calls[0][2]).toBe(
      "sub-service-req-ID",
    );
  });

  it("then it should not check the user organisation permission if email notification is not allowed for service", async () => {
    isServiceEmailNotificationAllowed.mockReset().mockReturnValue(false);
    await post(req, res);

    expect(getOrganisationPermissionLevel.mock.calls).toHaveLength(0);
  });

  it("then it should send an email notification if notifications are allowed", async () => {
    isServiceEmailNotificationAllowed.mockReset().mockReturnValue(true);
    await post(req, res);

    expect(sendSubServiceRequestApproved.mock.calls).toHaveLength(1);
    expect(sendSubServiceRequestApproved.mock.calls[0][0]).toBe("b@b.gov.uk");
    expect(sendSubServiceRequestApproved.mock.calls[0][1]).toBe("b");
    expect(sendSubServiceRequestApproved.mock.calls[0][2]).toBe("b");
    expect(sendSubServiceRequestApproved.mock.calls[0][3]).toBe("org1");
    expect(sendSubServiceRequestApproved.mock.calls[0][4]).toBe("service one");
    expect(sendSubServiceRequestApproved.mock.calls[0][5]).toStrictEqual([
      "ASP School Anon 1",
      "ASP School Anon 2",
      "ASP School Anon 3",
      "ASP School Anon 4",
      "ASP School Anon 5",
    ]);
    expect(sendSubServiceRequestApproved.mock.calls[0][6]).toEqual({
      id: 0,
      name: "End user",
    });
  });

  it("then it should not send an email notification if notifications are not allowed", async () => {
    isServiceEmailNotificationAllowed.mockReset().mockReturnValue(false);
    await post(req, res);

    expect(sendSubServiceRequestApproved.mock.calls).toHaveLength(0);
  });

  it("then it should render Success when its approved correctly", async () => {
    await post(req, res);
    expect(res.flash.mock.calls[0][0]).toBe("title");
    expect(res.flash.mock.calls[0][1]).toBe("Success");
    expect(res.flash.mock.calls[1][0]).toBe("heading");
    expect(res.flash.mock.calls[1][1]).toBe("Sub-service changes approved");
    expect(res.flash.mock.calls[2][0]).toBe("message");
    expect(res.flash.mock.calls[2][1]).toBe(
      `${viewModel.endUsersGivenName} ${viewModel.endUsersFamilyName} will receive an email to tell them their sub-service access has changed.`,
    );
  });

  it('then it should create "Sub-service added" banner', async () => {
    await post(req, res);

    expect(createSubServiceAddedBanners.mock.calls).toHaveLength(1);
    expect(createSubServiceAddedBanners.mock.calls[0][0]).toBe("endUser1");
    expect(createSubServiceAddedBanners.mock.calls[0][1]).toBe("service one");
    expect(createSubServiceAddedBanners.mock.calls[0][2]).toStrictEqual([
      "ASP School Anon 1",
      "ASP School Anon 2",
      "ASP School Anon 3",
      "ASP School Anon 4",
      "ASP School Anon 5",
    ]);
  });

  it("then it should render an error if the selectedResponse is missing", async () => {
    req.body.selectedResponse = null;
    await post(req, res);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/reviewSubServiceRequest",
    );
  });
});
