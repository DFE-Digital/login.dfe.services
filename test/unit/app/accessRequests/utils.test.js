jest.mock("login.dfe.dao", () =>
  require("./../../../utils/jestMocks").mockDao(),
);

const {
  generateFlashMessages,
  getUserDetails,
} = require("../../../../src/app/accessRequests/utils");

describe("AccessRequests utils", () => {
  describe("getUserDetails function", () => {
    it("should return an empty array when no ids are provided", async () => {
      const result = await getUserDetails([]);
      expect(result).toStrictEqual([]);
    });
  });

  describe("generateFlashMessages function", () => {
    const requestType = "service";
    const requestStatus = 1;
    const approverEmail = "approver@example.com";
    const endUsersGivenName = "test";
    const endUsersFamilyName = "user";
    const orgOrServName = "Test Service Name";

    it("should say request is approved when provided with a request status of 1", () => {
      const result = generateFlashMessages(
        requestType,
        requestStatus,
        approverEmail,
        endUsersGivenName,
        endUsersFamilyName,
        orgOrServName,
      );

      expect(result).toStrictEqual({
        heading: "Service request already approved: Test Service Name",
        message:
          "approver@example.com has already responded to the service request.<br>Test User has received an email to tell them their request has been approved. No further action is needed.",
        title: "Important",
      });
    });

    it("should say request is rejected when provided with a request status of 0", () => {
      const result = generateFlashMessages(
        requestType,
        -1,
        approverEmail,
        endUsersGivenName,
        endUsersFamilyName,
        orgOrServName,
      );

      expect(result).toStrictEqual({
        heading: "Service request already rejected: Test Service Name",
        message:
          "approver@example.com has already responded to the service request.<br>Test User has received an email to tell them their request has been rejected. No further action is needed.",
        title: "Important",
      });
    });
  });
});
