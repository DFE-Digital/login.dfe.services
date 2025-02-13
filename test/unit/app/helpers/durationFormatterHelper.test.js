const {
  getMomentFormattedDuration,
} = require("../../../../src/app/helpers/durationFormatterHelper");

describe("Duration formatter", () => {
  it("should correctly format a minute", () => {
    expect(getMomentFormattedDuration(1)).toBe("a minute");
  });

  it("should correctly format 20 minutes", () => {
    expect(getMomentFormattedDuration(20)).toBe("20 minutes");
  });

  it("should correctly format 21 minutes", () => {
    expect(getMomentFormattedDuration(21)).toBe("21 minutes");
  });

  it("should correctly format 60 minutes", () => {
    expect(getMomentFormattedDuration(60)).toBe("an hour");
  });

  it("should correctly format 120 minutes", () => {
    expect(getMomentFormattedDuration(120)).toBe("2 hours");
  });

  it("should correctly format 480 minutes", () => {
    expect(getMomentFormattedDuration(480)).toBe("8 hours");
  });

  it("should correctly format 490 minutes", () => {
    expect(getMomentFormattedDuration(490)).toBe("8 hours");
  });
});
