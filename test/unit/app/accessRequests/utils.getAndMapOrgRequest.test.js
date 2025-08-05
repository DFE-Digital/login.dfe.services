const { mockRequest } = require("../../../utils/jestMocks");
jest.mock("../../../../src/infrastructure/organisations");
jest.mock("login.dfe.dao", () => require("../../../utils/jestMocks").mockDao());
jest.mock("../../../../src/infrastructure/account", () => ({
  getById: jest.fn(),
}));
jest.mock("login.dfe.api-client/users", () => {
  return {
    getUserService: jest.fn(),
  };
});

const Account = require("../../../../src/infrastructure/account");
const {
  getRequestById,
} = require("../../../../src/infrastructure/organisations");
const { getUserService } = require("login.dfe.api-client/users");
const {
  getAndMapOrgRequest,
} = require("../../../../src/app/accessRequests/utils");

let req;

describe("utils.getAndMapOrgRequest", () => {
  beforeEach(() => {
    req = mockRequest();
    req.params = {
      rid: "req-1",
    };
    getRequestById.mockReset().mockReturnValue({
      usersName: "John Doe",
      usersEmail: "john.doe@email.com",
      id: "requestId",
      org_id: "org1",
      org_name: "Org 1",
      user_id: "userId",
      created_date: "2019-05-01",
      actioned_date: null,
      actioned_by: null,
      actioned_reason: null,
      reason: "",
      status: {
        id: 0,
        name: "Pending",
      },
    });

    getUserService.mockReset().mockReturnValue({
      id: "service-id-1",
      name: "support service",
    });

    Account.getById.mockReset().mockReturnValue({
      claims: {
        sub: "user-id-2",
        given_name: "User",
        family_name: "One",
        email: "user.one@unit.tests",
      },
    });
  });

  it("should retrieve and map the request when there is no approver", async () => {
    const result = await getAndMapOrgRequest(req);
    expect(result).toStrictEqual({
      actioned_by: null,
      actioned_date: null,
      actioned_reason: null,
      approverEmail: "",
      approverName: "",
      created_date: "2019-05-01",
      id: "requestId",
      org_id: "org1",
      org_name: "Org 1",
      reason: "",
      status: {
        id: 0,
        name: "Pending",
      },
      user_id: "userId",
      usersEmail: "john.doe@email.com",
      usersName: "John Doe",
    });
  });

  it("should retrieve and map the request when there is an approver who is part of the support team", async () => {
    getRequestById.mockReset().mockReturnValue({
      usersName: "John Doe",
      usersEmail: "john.doe@email.com",
      id: "requestId",
      org_id: "org1",
      org_name: "Org 1",
      user_id: "userId",
      created_date: "2025-05-01",
      actioned_date: null,
      actioned_by: "approver-user-1",
      actioned_reason: null,
      reason: "",
      status: {
        id: 0,
        name: "Pending",
      },
    });

    const result = await getAndMapOrgRequest(req);

    expect(result).toStrictEqual({
      actioned_by: "approver-user-1",
      actioned_date: null,
      actioned_reason: null,
      approverEmail: "NewApprover.dfesignin@education.gov.uk",
      approverName: "DfE Sign-in support team",
      created_date: "2025-05-01",
      id: "requestId",
      org_id: "org1",
      org_name: "Org 1",
      reason: "",
      status: {
        id: 0,
        name: "Pending",
      },
      user_id: "userId",
      usersEmail: "john.doe@email.com",
      usersName: "John Doe",
    });
  });

  it("should retrieve and map the request when there is an approver who is NOT part of the support team", async () => {
    getRequestById.mockReset().mockReturnValue({
      usersName: "John Doe",
      usersEmail: "john.doe@email.com",
      id: "requestId",
      org_id: "org1",
      org_name: "Org 1",
      user_id: "userId",
      created_date: "2025-05-01",
      actioned_date: null,
      actioned_by: "approver-user-1",
      actioned_reason: null,
      reason: "",
      status: {
        id: 0,
        name: "Pending",
      },
    });

    Account.getById
      .mockReset()
      .mockReturnValueOnce({
        sub: "approver-user-1",
        given_name: "Approver User",
        family_name: "Test",
        email: "approver-user.one@unit.tests",
      })
      .mockReturnValue({
        claims: {
          sub: "user-id-2",
          given_name: "User",
          family_name: "One",
          email: "user.one@unit.tests",
        },
      });

    getUserService.mockReset().mockReturnValue(null);

    const result = await getAndMapOrgRequest(req);

    expect(result).toStrictEqual({
      actioned_by: "approver-user-1",
      actioned_date: null,
      actioned_reason: null,
      approverEmail: "approver-user.one@unit.tests",
      approverName: "Approver User Test",
      created_date: "2025-05-01",
      id: "requestId",
      org_id: "org1",
      org_name: "Org 1",
      reason: "",
      status: {
        id: 0,
        name: "Pending",
      },
      user_id: "userId",
      usersEmail: "john.doe@email.com",
      usersName: "John Doe",
    });
  });
});
