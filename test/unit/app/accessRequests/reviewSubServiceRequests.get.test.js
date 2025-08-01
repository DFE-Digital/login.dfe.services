const {
  mockRequest,
  mockResponse,
  mockAdapterConfig,
} = require("../../../utils/jestMocks");
const {
  getSubServiceRequestVieModel,
  getAndMapServiceRequest,
} = require("../../../../src/app/accessRequests/utils");
const Account = require("../../../../src/infrastructure/account");
jest.mock("login.dfe.policy-engine");
jest.mock("../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});
jest.mock("../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);
jest.mock("./../../../../src/infrastructure/account", () => ({
  fromContext: jest.fn(),
  getById: jest.fn(),
}));

jest.mock("../../../../src/app/accessRequests/utils", () => {
  return {
    getAndMapServiceRequest: jest.fn(),
    getSubServiceRequestVieModel: jest.fn(),
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
const viewModel = {
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
  validationMessages: {},
  currentPage: "requests",
  Role_name: "role  one",
  service_name: "service one",
};

jest.mock("../../../../src/app/users/utils");

describe("When reviewing a sub-service request for approving", () => {
  let req;
  let res;

  let getSubServiceRequest;

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
        status: 0,
        actioned_reason: "Pending",
        actioned_by: null,
        reason: "Pending",
        csrfToken: null,
        selectedResponse: null,
        validationMessages: {},
        currentPage: "requests",
        Role_name: "role  one",
        service_name: "service one",
      },
    });

    res = mockResponse();

    Account.getById.mockReset().mockReturnValue([
      {
        claims: {
          sub: "user-id-1",
          given_name: "User",
          family_name: "One",
          email: "user.one@unit.tests",
        },
      },
      {
        claims: {
          sub: "user-id-2",
          given_name: "User",
          family_name: "Two",
          email: "user.two@unit.tests",
        },
      },
    ]);

    getAndMapServiceRequest.mockReset();
    getAndMapServiceRequest.mockReturnValue(viewModel);

    getSubServiceRequestVieModel.mockReset();
    getSubServiceRequestVieModel.mockReturnValue(viewModel);

    getSubServiceRequest =
      require("../../../../src/app/accessRequests/reviewSubServiceRequest").get;
  });

  it("then it should display the review request view", async () => {
    await getSubServiceRequest(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/reviewSubServiceRequest",
    );
  });

  it("then it should get the mapped request", async () => {
    await getSubServiceRequest(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(getSubServiceRequestVieModel.mock.calls[0][0]).toBe(viewModel);
  });

  it("then it should include csrf token", async () => {
    await getSubServiceRequest(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
    });
  });

  it("then it should include the request details", async () => {
    await getSubServiceRequest(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
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
      csrfToken: "token",
      selectedResponse: null,
      validationMessages: {},
      currentPage: "requests",
      Role_name: "role  one",
      service_name: "service one",
      subServiceAmendUrl:
        "/approvals/org1/users/endUser1/services/service1?actions=review-subservice-request",
    });
  });
});
