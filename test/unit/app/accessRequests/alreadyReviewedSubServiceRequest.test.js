const {
  mockRequest,
  mockResponse,
  mockAdapterConfig,
  mockConfig,
} = require("../../../utils/jestMocks");
const {
  getSubServiceRequestVieModel,
  getAndMapServiceRequest,
  generateFlashMessages,
  getNewRoleDetails,
} = require("../../../../src/app/accessRequests/utils");
const Account = require("../../../../src/infrastructure/account");
jest.mock("login.dfe.policy-engine");
jest.mock("../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});
jest.mock("../../../../src/infrastructure/config", () => {
  return mockConfig();
});
jest.mock("../../../../src/infrastructure/logger", () =>
  require("../../../utils/jestMocks").mockLogger(),
);
jest.mock("./../../../../src/infrastructure/account", () => ({
  fromContext: jest.fn(),
  getById: jest.fn(),
}));

jest.mock("../../../../src/app/accessRequests/utils", () => {
  return {
    getAndMapServiceRequest: jest.fn(),
    getSubServiceRequestVieModel: jest.fn(),
    generateFlashMessages: jest.fn(),
    getNewRoleDetails: jest.fn(),
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
const listRoles = [
  {
    code: "ASP_School_Anon",
    id: "01379D9F-A6DF-4810-A6C4-5468CBD41E42",
    name: "ASP School Anon",
    numericId: "124",
  },
  {
    code: "ASP_School_Anon",
    id: "01379D9F-A6DF-4810-A6C4-5468CBD41E42",
    name: "ASP School Anon",
    numericId: "124",
  },
  {
    code: "ASP_School_Anon",
    id: "01379D9F-A6DF-4810-A6C4-5468CBD41E42",
    name: "ASP School Anon",
    numericId: "124",
  },
  {
    code: "ASP_School_Anon",
    id: "01379D9F-A6DF-4810-A6C4-5468CBD41E42",
    name: "ASP School Anon",
    numericId: "124",
  },
  {
    code: "ASP_School_Anon",
    id: "01379D9F-A6DF-4810-A6C4-5468CBD41E42",
    name: "ASP School Anon",
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
  status: 1,
  actioned_reason: "Approved",
  actioned_by: "user1",
  reason: "Approved",
  csrfToken: null,
  selectedResponse: null,
  validationMessages: {},
  currentPage: "requests",
  Role_name: "role  one",
  service_name: "service one",
  roles: listRoles,
};
const flashMessages = {
  title: "Important",
  heading: `Sub-service request already Approved: accademic organisatioon`,
  message: `user.one@unit.tests has already responded to the Sub-service request.<br>User One has received an email to tell them their request has been Approved. No further action is needed.`,
};
const model = {
  _changed: 0,
  _options: null,
  _previousDataValues: null,
  approverEmail: "",
  approverName: "",
  dataValues: {
    id: "request1",
    actioned_by: "user1",
    actioned_at: null,
    actioned_reason: "Approved",
    createdAt: new Date(),
    organisation_id: "org1",
    reason: "",
    role_ids: "role1",
    service_id: "service1",
    status: 1,
    updatedAt: new Date(),
    user_id: "endUser1",
  },
  endUsersEmail: "b@b.gov.uk",
  endUsersFamilyName: "b",
  endUsersGvenName: "b",
  isNewRecord: false,
  organisation: { id: "org1", name: "accademic organisatioon" },
};
const request = {
  _changed: 0,
  _options: null,
  _previousDataValues: null,
  approverEmail: "",
  approverName: "",
  dataValues: {
    id: "request1",
    actioned_by: "user1",
    actioned_at: null,
    actioned_reason: "Approved",
    createdAt: new Date(),
    organisation_id: "org1",
    reason: "",
    role_ids: "role1",
    service_id: "service1",
    status: 1,
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

describe("When reviewing a sub-service request for approving", () => {
  let req;
  let res;

  let getSubServiceRequest;
  let postSubServiceRequest;
  beforeEach(() => {
    req = mockRequest({
      params: {
        rid: "sub-service-req-ID",
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
        status: 1,
        actioned_reason: "Approved",
        actioned_by: "user1",
        reason: "Approved",
        csrfToken: null,
        selectedResponse: null,
        validationMessages: {},
        currentPage: "requests",
        Role_name: "role  one",
        service_name: "service one",
      },
    });

    res = mockResponse();

    Account.getById.mockReset().mockReturnValue({
      claims: {
        sub: "user1",
        given_name: "User",
        family_name: "One",
        email: "user.one@unit.tests",
      },
    });

    getAndMapServiceRequest.mockReset();
    getAndMapServiceRequest.mockReturnValue(request);

    getSubServiceRequestVieModel.mockReset();
    getSubServiceRequestVieModel.mockReturnValue(viewModel);

    generateFlashMessages.mockReset();
    generateFlashMessages.mockReturnValue(flashMessages);

    getNewRoleDetails.mockReset();
    getNewRoleDetails.mockReturnValue(listRoles);

    getSubServiceRequest =
      require("../../../../src/app/accessRequests/reviewSubServiceRequest").get;
    postSubServiceRequest =
      require("../../../../src/app/accessRequests/reviewSubServiceRequest").post;
  });

  it("then it should redirect to to request page and display a message", async () => {
    await getSubServiceRequest(req, res);

    expect(res.flash.mock.calls).toHaveLength(3);
    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/access-requests/requests");
    expect(res.flash.mock.calls[0][0]).toBe("title");
    expect(res.flash.mock.calls[0][1]).toBe("Important");
    expect(res.flash.mock.calls[1][0]).toBe("heading");
    expect(res.flash.mock.calls[1][1]).toBe(
      "Sub-service request already Approved: accademic organisatioon",
    );
    expect(res.flash.mock.calls[2][0]).toBe("message");
    expect(res.flash.mock.calls[2][1]).toBe(
      "user.one@unit.tests has already responded to the Sub-service request.<br>User One has received an email to tell them their request has been Approved. No further action is needed.",
    );
  });
  it("then it should redirect to to request page and display a message", async () => {
    await postSubServiceRequest(req, res);

    expect(res.flash.mock.calls).toHaveLength(3);
    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/access-requests/requests");
    expect(res.flash.mock.calls[0][0]).toBe("title");
    expect(res.flash.mock.calls[0][1]).toBe("Important");
    expect(res.flash.mock.calls[1][0]).toBe("heading");
    expect(res.flash.mock.calls[1][1]).toBe(
      "Sub-service request already Approved: accademic organisatioon",
    );
    expect(res.flash.mock.calls[2][0]).toBe("message");
    expect(res.flash.mock.calls[2][1]).toBe(
      "user.one@unit.tests has already responded to the Sub-service request.<br>User One has received an email to tell them their request has been Approved. No further action is needed.",
    );
  });
});
