const mockPutUserServiceRequest = jest.fn();
jest.mock("login.dfe.dao", () => ({
  services: {
    putUserServiceRequest: mockPutUserServiceRequest,
  },
}));

const {
  createServiceRequest,
} = require("../../../../src/app/requestService/utils");

describe("requestService/utils functions", () => {
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
      "should have '%s' in the return value when the status is '%s'",
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
});
