jest.mock("login.dfe.dao", () => require("../../../utils/jestMocks").mockDao());

const {
  getMappedRequestServiceWithSubServices,
} = require("../../../../src/app/accessRequests/utils");

describe("getMappedRequestServiceWithSubServices function", () => {
  it("should raise an exception if the request is", async () => {
    expect(getMappedRequestServiceWithSubServices(undefined)).rejects.toThrow(
      TypeError,
    );
    expect(getMappedRequestServiceWithSubServices(undefined)).rejects.toThrow(
      "userRequest must be a non-null object",
    );
  });
});
