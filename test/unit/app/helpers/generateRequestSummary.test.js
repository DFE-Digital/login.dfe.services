const generateRequestSummary = require("../../../../src/app/helpers/generateRequestSummary");

describe("generateRequestSummary", () => {
  it("should generate summary for service request", () => {
    const request = {
      type: "service",
      serviceName: "Test Service 123",
      organisationName: "Test Organisation 123",
    };
    expect(generateRequestSummary(request)).toBe(
      "Service request for Test Service 123 for Test Organisation 123",
    );
  });

  it("should generate summary for organisation request", () => {
    const request = {
      type: "organisation",
      organisationName: "Test Organisation 123",
    };
    expect(generateRequestSummary(request)).toBe(
      "Organisation request for Test Organisation 123",
    );
  });

  it("should generate summary for subservice request", () => {
    const request = {
      type: "subservice",
      subserviceName: "Test Sub-Service 789",
      serviceName: "Test Service 456",
      organisationName: "Test Organisation 123",
    };
    expect(generateRequestSummary(request)).toBe(
      "Subservice request for Email Setup for Test Sub-Service 789 for Test Organisation 123",
    );
  });

  it("should return error for missing fields in service request", () => {
    const request = {
      type: "service",
      organisationName: "Test Organisation 123",
    };
    expect(generateRequestSummary(request, 0)).toBe(
      "Error in request 1: Missing serviceName or organisationName",
    );
  });

  it("should return error for missing organisationName in organisation request", () => {
    const request = {
      type: "organisation",
    };
    expect(generateRequestSummary(request, 1)).toBe(
      "Error in request 2: Missing organisationName",
    );
  });

  it("should return error for missing fields in subservice request", () => {
    const request = {
      type: "subservice",
      subserviceName: "Test Sub-Service 789",
      serviceName: "Test Service 456",
    };
    expect(generateRequestSummary(request, 2)).toBe(
      "Error in request 3: Missing subserviceName, serviceName, or organisationName",
    );
  });

  it("should return error for invalid request type", () => {
    const request = {
      type: "invalid",
      organisationName: "Test Organisation 123",
    };
    expect(generateRequestSummary(request, 3)).toBe(
      "Error in request 4: Invalid request type",
    );
  });
});
