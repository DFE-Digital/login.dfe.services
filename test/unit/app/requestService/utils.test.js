const mockPutUserServiceRequest = jest.fn();
const mockGetUserServiceRequest = jest.fn();
const mockUpdateUserPendingServiceRequest = jest.fn();

jest.mock("login.dfe.dao", () => ({
  services: {
    putUserServiceRequest: mockPutUserServiceRequest,
    getUserServiceRequest: mockGetUserServiceRequest,
    updateUserPendingServiceRequest: mockUpdateUserPendingServiceRequest,
  },
}));

jest.mock("login.dfe.api-client/services");
const {
  getAllRequestTypesForApproverRaw,
} = require("login.dfe.api-client/services");

const {
  checkForActiveRequests,
  createServiceRequest,
  getUserServiceRequestStatus,
  updateServiceRequest,
} = require("../../../../src/app/requestService/utils");

describe("requestService/utils functions", () => {
  beforeEach(() => {
    mockGetUserServiceRequest.mockReset();
    mockUpdateUserPendingServiceRequest.mockReset();
    getAllRequestTypesForApproverRaw.mockReset();
  });

  it("getUserServiceRequestStatus - should return the status of the request", async () => {
    mockGetUserServiceRequest.mockReset().mockReturnValue({ status: 1 });

    const reqId = "req-1";

    const result = await getUserServiceRequestStatus(reqId);
    expect(result).toBe(1);
  });

  describe("createServiceRequest function", () => {
    beforeEach(() => {
      mockPutUserServiceRequest.mockReset();
    });

    const testCases = [
      ["Approved", 1],
      ["Pending", 0],
      ["Rejected", -1],
    ];

    it.each(testCases)(
      "should have actioned_reason of '%s' and a status of '%s' in the putUserServiceRequest",
      (description, status) => {
        const reqId = "req-1";
        const userId = "user-1";
        const serviceId = "service-1";
        const rolesIds = "role-1,role-2";
        const organisationId = "org-1";
        const requestType = "service";
        createServiceRequest(
          reqId,
          userId,
          serviceId,
          rolesIds,
          organisationId,
          status,
          requestType,
        );

        expect(mockPutUserServiceRequest.mock.calls).toStrictEqual([
          [
            {
              actioned_reason: description,
              id: reqId,
              organisation_id: organisationId,
              request_type: requestType,
              role_ids: rolesIds,
              service_id: serviceId,
              status: status,
              user_id: userId,
            },
          ],
        ]);
      },
    );
  });

  describe("updateServiceRequest function", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01"));

    beforeEach(() => {
      mockUpdateUserPendingServiceRequest.mockReset();
    });

    const testCases = [
      ["Approved", 1],
      ["Pending", 0],
      ["Rejected", -1],
    ];

    it.each(testCases)(
      "should have reason of '%s' and a status of '%s' in when calling mockUpdateUserPendingServiceRequest",
      (description, status) => {
        const reqId = "req-1";
        const approverId = "approver-1";
        const reason = "This is a reason";

        updateServiceRequest(reqId, status, approverId, reason);

        expect(mockUpdateUserPendingServiceRequest.mock.calls).toStrictEqual([
          [
            reqId,
            {
              status,
              actioned_by: approverId,
              reason,
              actioned_reason: description,
              actioned_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        ]);
      },
    );
  });

  describe("checkForActiveRequests function", () => {
    const selectServiceID = "1";
    const organisationId = "org-1";
    const reqId = "req-1";
    const requestType = "service";
    const uid = "uid-1";
    const roleIds = "role-1,role-2";
    const totalServiceCount = 1;

    beforeEach(() => {
      mockUpdateUserPendingServiceRequest.mockReset();
      getAllRequestTypesForApproverRaw.mockReset().mockReturnValue(undefined);
    });

    it("should return approvers if approvers is undefined or an empty array", async () => {
      const organisationDetails = { approvers: [] };
      const result = await checkForActiveRequests(
        organisationDetails,
        selectServiceID,
        organisationId,
        uid,
        reqId,
        requestType,
        roleIds,
        totalServiceCount,
      );

      expect(result).toStrictEqual([]);
    });

    it("should return undefined if getAllRequestTypesForApproverRaw returns undefined", async () => {
      const organisationDetails = { approvers: [{ id: "user-1" }] };

      const result = await checkForActiveRequests(
        organisationDetails,
        selectServiceID,
        organisationId,
        uid,
        reqId,
        requestType,
        roleIds,
        totalServiceCount,
      );

      expect(result).toBe(undefined);
    });
  });
});
