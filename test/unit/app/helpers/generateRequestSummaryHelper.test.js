const generateRequestSummary = require("../../../../src/app/helpers/generateRequestSummaryHelper");

describe("when generating a summary of an access request for presentation", () => {
  it("should generate summary for service request", () => {
    const request = {
      request_type: { name: "Service access" },
      serviceName: "Test Service 456",
      organisationName: "Test Organisation 123",
    };
    expect(generateRequestSummary(request)).toBe(
      "Service request for Test Service 456 for Test Organisation 123",
    );
  });

  it("should generate summary for organisation request", () => {
    const request = {
      request_type: { name: "Organisation access" },
      organisationName: "Test Organisation 123",
    };
    expect(generateRequestSummary(request)).toBe(
      "Organisation request for Test Organisation 123",
    );
  });

  it("should generate summary for subservice request", () => {
    const request = {
      request_type: { name: "Sub-service access" },
      subserviceName: "Test Sub-Service 789",
      serviceName: "Test Service 456",
      organisationName: "Test Organisation 123",
    };
    expect(generateRequestSummary(request)).toBe(
      "Subservice request for Test Sub-Service 789 for Test Service 456 for Test Organisation 123",
    );
  });

  it("should return error for missing fields in service request", () => {
    const request = {
      request_type: { name: "Service access" },
      organisationName: "Test Organisation 123",
    };
    expect(generateRequestSummary(request, 0)).toBe(
      "Error in request 1: Missing serviceName or organisationName",
    );
  });

  it("should return error for missing organisationName in organisation request", () => {
    const request = {
      request_type: { name: "Organisation access" },
    };
    expect(generateRequestSummary(request, 1)).toBe(
      "Error in request 2: Missing organisationName",
    );
  });

  it("should return error for missing fields in subservice request", () => {
    const request = {
      request_type: { name: "Sub-service access" },
      subserviceName: "Test Sub-Service 789",
      serviceName: "Test Service 456",
    };
    expect(generateRequestSummary(request, 2)).toBe(
      "Error in request 3: Missing subserviceName, serviceName, or organisationName",
    );
  });

  it("should return error for invalid request type", () => {
    const request = {
      request_type: { name: "invalid" },
      organisationName: "Test Organisation 123",
    };
    expect(generateRequestSummary(request, 3)).toBe(
      "Error in request 4: Invalid request type",
    );
  });

  it("should return error if request_type is missing", () => {
    const request = {
      organisationName: "Test Organisation 123",
    };
    expect(generateRequestSummary(request, 4)).toBe(
      "Error in request 5: Invalid request type",
    );
  });
});
