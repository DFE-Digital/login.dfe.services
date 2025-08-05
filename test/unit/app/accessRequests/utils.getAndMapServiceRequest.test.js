jest.mock("../../../../src/infrastructure/organisations");
jest.mock("../../../../src/infrastructure/account", () => ({
  getById: jest.fn(),
}));
jest.mock("login.dfe.dao", () => {
  return {
    services: {
      getUserServiceRequest: async () => {
        return {
          id: "BE476856-57D0-4E06-8F6F-0668A4F3CB91",
          user_id: "DA8A2B9A-3670-4823-B778-A78AE3403BB6",
          service_id: "909C467C-6B73-45F0-9548-8062152FA7D3",
          role_ids: "5D80B58F-C726-4669-8CFE-A8776BD11A04",
          organisation_id: "FAA4A47A-0D26-4EB5-8BE5-11CCB53AD801",
          request_type: "service",
          status: 0,
          reason: null,
          actioned_by: null,
          actioned_reason: "Pending",
          actioned_at: null,
          createdAt: "2025-08-05T13:56:58.696Z",
          updatedAt: "2025-08-05T13:56:58.696Z",
        };
      },
    },
  };
});

jest.mock("login.dfe.api-client/users", () => {
  return {
    getUserService: jest.fn(),
  };
});

const Account = require("../../../../src/infrastructure/account");
const { getUserService } = require("login.dfe.api-client/users");
const {
  getAndMapServiceRequest,
} = require("../../../../src/app/accessRequests/utils");

const serviceRequestId = "service-req-1";

describe("utils.getAndMapServiceRequest function", () => {
  beforeEach(() => {
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
    jest.mock("login.dfe.dao", () => {
      return {
        services: {
          getUserServiceRequest: async () => {
            return {
              id: "BE476856-57D0-4E06-8F6F-0668A4F3CB91",
              user_id: "DA8A2B9A-3670-4823-B778-A78AE3403BB6",
              service_id: "909C467C-6B73-45F0-9548-8062152FA7D3",
              role_ids: "5D80B58F-C726-4669-8CFE-A8776BD11A04",
              organisation_id: "FAA4A47A-0D26-4EB5-8BE5-11CCB53AD801",
              request_type: "service",
              status: 0,
              reason: null,
              actioned_by: null,
              actioned_reason: "Pending",
              actioned_at: null,
              createdAt: "2025-08-05T13:56:58.696Z",
              updatedAt: "2025-08-05T13:56:58.696Z",
            };
          },
        },
      };
    });
    const result = await getAndMapServiceRequest(serviceRequestId);
    expect(result).toStrictEqual({
      actioned_at: null,
      actioned_by: null,
      actioned_reason: "Pending",
      approverEmail: "",
      approverName: "",
      createdAt: "2025-08-05T13:56:58.696Z",
      endUsersEmail: "user.one@unit.tests",
      endUsersFamilyName: "One",
      endUsersGivenName: "User",
      id: "BE476856-57D0-4E06-8F6F-0668A4F3CB91",
      organisation: undefined,
      organisation_id: "FAA4A47A-0D26-4EB5-8BE5-11CCB53AD801",
      reason: null,
      request_type: "service",
      role_ids: "5D80B58F-C726-4669-8CFE-A8776BD11A04",
      service_id: "909C467C-6B73-45F0-9548-8062152FA7D3",
      status: 0,
      updatedAt: "2025-08-05T13:56:58.696Z",
      user_id: "DA8A2B9A-3670-4823-B778-A78AE3403BB6",
    });
  });

  // it("should retrieve and map the request when there is an approver who is part of the support team",  async () => {
  //   jest.mock("login.dfe.dao", () => {
  //     return {
  //       services: {
  //         getUserServiceRequest: async () => {
  //           return {
  //             id: "BE476856-57D0-4E06-8F6F-0668A4F3CB91",
  //             user_id: "DA8A2B9A-3670-4823-B778-A78AE3403BB6",
  //             service_id: "909C467C-6B73-45F0-9548-8062152FA7D3",
  //             role_ids: "5D80B58F-C726-4669-8CFE-A8776BD11A04",
  //             organisation_id: "FAA4A47A-0D26-4EB5-8BE5-11CCB53AD801",
  //             request_type: "service",
  //             status: 0,
  //             reason: null,
  //             actioned_by: "approver-user-1",
  //             actioned_reason: "Pending",
  //             actioned_at: null,
  //             createdAt: "2025-08-05T13:56:58.696Z",
  //             updatedAt: "2025-08-05T13:56:58.696Z",
  //           };
  //         },
  //       },
  //     };
  //   });
  //   Account.getById.mockReset().mockReturnValueOnce({
  //     sub: "approver-user-1",
  //     given_name: "Approver User",
  //     family_name: "Test",
  //     email: "approver-user.one@unit.tests",
  //   }).mockReturnValue({
  //     claims: {
  //       sub: "user-id-2",
  //       given_name: "User",
  //       family_name: "One",
  //       email: "user.one@unit.tests",
  //     },
  //   });

  //   const result = await getAndMapServiceRequest(serviceRequestId);

  //   expect(result).toStrictEqual({
  //     "actioned_at": null,
  //     "actioned_by": null,
  //     "actioned_reason": "Pending",
  //     "approverEmail": "",
  //     "approverName": "",
  //     "createdAt": "2025-08-05T13:56:58.696Z",
  //     "endUsersEmail": "user.one@unit.tests",
  //     "endUsersFamilyName": "One",
  //     "endUsersGivenName": "User",
  //     "id": "BE476856-57D0-4E06-8F6F-0668A4F3CB91",
  //     "organisation": undefined,
  //     "organisation_id": "FAA4A47A-0D26-4EB5-8BE5-11CCB53AD801",
  //     "reason": null,
  //     "request_type": "service",
  //     "role_ids": "5D80B58F-C726-4669-8CFE-A8776BD11A04",
  //     "service_id": "909C467C-6B73-45F0-9548-8062152FA7D3",
  //     "status": 0,
  //     "updatedAt": "2025-08-05T13:56:58.696Z",
  //     "user_id": "DA8A2B9A-3670-4823-B778-A78AE3403BB6",
  //   });
  // });

  // it("should retrieve and map the request when there is an approver who is NOT part of the support team",  async () => {
  //   jest.mock("login.dfe.dao", () => {
  //     return {
  //       services: {
  //         getUserServiceRequest: async () => {
  //           return {
  //             id: "BE476856-57D0-4E06-8F6F-0668A4F3CB91",
  //             user_id: "DA8A2B9A-3670-4823-B778-A78AE3403BB6",
  //             service_id: "909C467C-6B73-45F0-9548-8062152FA7D3",
  //             role_ids: "5D80B58F-C726-4669-8CFE-A8776BD11A04",
  //             organisation_id: "FAA4A47A-0D26-4EB5-8BE5-11CCB53AD801",
  //             request_type: "service",
  //             status: 0,
  //             reason: null,
  //             actioned_by: "approver-user-1",
  //             actioned_reason: "Pending",
  //             actioned_at: null,
  //             createdAt: "2025-08-05T13:56:58.696Z",
  //             updatedAt: "2025-08-05T13:56:58.696Z",
  //           };
  //         },
  //       },
  //     };
  //   });

  //   Account.getById.mockReset().mockReturnValueOnce({
  //     sub: "approver-user-1",
  //     given_name: "Approver User",
  //     family_name: "Test",
  //     email: "approver-user.one@unit.tests",
  //   }).mockReturnValue({
  //     claims: {
  //       sub: "user-id-2",
  //       given_name: "User",
  //       family_name: "One",
  //       email: "user.one@unit.tests",
  //     },
  //   });

  //   getUserService.mockReset().mockReturnValue(null);

  //   const result = await getAndMapServiceRequest(serviceRequestId);

  //   expect(result).toStrictEqual({
  //     "actioned_by": "approver-user-1",
  //     "actioned_date": null,
  //     "actioned_reason": null,
  //     "approverEmail": "approver-user.one@unit.tests",
  //     "approverName": "Approver User Test",
  //     "created_date": "2025-05-01",
  //     "id": "requestId",
  //     "org_id": "org1",
  //     "org_name": "Org 1",
  //     "reason": "",
  //     "status": {
  //       "id": 0,
  //       "name": "Pending",
  //     },
  //     "user_id": "userId",
  //     "usersEmail": "john.doe@email.com",
  //     "usersName": "John Doe",
  //   });
  // });
});
