const {
  mockRequest,
  mockResponse,
  mockAdapterConfig,
} = require("../../../utils/jestMocks");
const {
  getSubServiceRequestVieModel,
  getAndMapServiceRequest,
} = require("../../../../src/app/accessRequests/utils");
const {
  updateServiceRequest,
} = require("../../../../src/app/requestService/utils");
const {
  get,
} = require("../../../../src/app/accessRequests/rejectSubServiceRequest");
const sendAccessRequest = jest.fn();

const Account = require("../../../../src/infrastructure/account");
jest.mock("login.dfe.policy-engine");
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

jest.mock("../../../../src/app/accessRequests/utils", () => {
  return {
    getAndMapServiceRequest: jest.fn(),
    getSubServiceRequestVieModel: jest.fn(),
  };
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
};
jest.mock("../../../../src/app/users/utils");

describe("When reviewing a sub-service request for rejection", () => {
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
        selectedResponse: "reject",
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
          reason: "reject",
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
        selectedResponse: "reject",
        validationMessages: {},
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

    updateServiceRequest.mockReset();
    updateServiceRequest.mockReturnValue((request = { success: true }));

    getAndMapServiceRequest.mockReset();
    getAndMapServiceRequest.mockReturnValue(model);

    getSubServiceRequestVieModel.mockReset();
    getSubServiceRequestVieModel.mockReturnValue(viewModel);
  });

  it("then it should render an empty view", async () => {
    await get(req, res);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/rejectSubServiceRequest",
    );
  });
});
