const {
  getFormattedMomentForTz,
  dateFormat,
  isLoginOver24,
} = require("../../../../src/app/helpers/timezoneHelper");

describe("Date Formatter Functions", () => {
  const testDate = new Date("2024-12-13 12:00:00.447"); // Example date

  it("Should format date correctly in short format", () => {
    const formattedDate = getFormattedMomentForTz(testDate, "DD MMM YYYY");
    expect(formattedDate).toBe("13 Dec 2024");
  });

  it("Should format date correctly in long format", () => {
    const formattedDate = getFormattedMomentForTz(
      testDate,
      "DD MMM YYYY hh:mma",
    );
    expect(formattedDate).toBe("13 Dec 2024 12:00pm");
  });

  it("Should throw TypeError for invalid date", () => {
    expect(() =>
      getFormattedMomentForTz("invalid date", "DD MMM YYYY"),
    ).toThrow(TypeError);
  });

  it("Should format date correctly in short format", () => {
    const formattedDate = dateFormat(testDate, "shortDateFormat");
    expect(formattedDate).toBe("13 Dec 2024");
  });

  it("Should format date correctly in long format", () => {
    const formattedDate = dateFormat(testDate, "longDateFormat");
    expect(formattedDate).toBe("13 Dec 2024 12:00pm");
  });

  it("Should return true if the difference is greater than 24 hours", () => {
    const last_login = "2024-08-31 14:27:58.447";
    const prev_login = "2024-08-30 10:00:00.000";
    expect(isLoginOver24(last_login, prev_login)).toBe(true);
  });

  it("Should return false if the difference is less than 24 hours", () => {
    const last_login = "2024-08-30 14:27:58.447";
    const prev_login = "2024-08-30 11:00:00.000";
    expect(isLoginOver24(last_login, prev_login)).toBe(false);
  });

  it("Should return false if the difference is exactly 24 hours", () => {
    const last_login = "2024-08-31 14:27:58.447";
    const prev_login = "2024-08-30 14:27:58.447";
    expect(isLoginOver24(last_login, prev_login)).toBe(false);
  });
});
