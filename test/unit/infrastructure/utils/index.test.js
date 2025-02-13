const { mockConfig } = require("../../../utils/jestMocks");
const { mapUserStatus } = require("../../../../src/infrastructure/utils");

jest.mock("../../../../src/infrastructure/config", () => mockConfig());

describe("mapUserStatus helper function", () => {
  it("should return unknown when statusId is undefined", () => {
    const statusId = undefined;
    const expected = {
      id: undefined,
      changedOn: null,
      description: "Unknown",
      tagColor: "grey",
    };
    const result = mapUserStatus(statusId);

    expect(result).toEqual(expected);
  });
  it("should return the correct status object when status exists", () => {
    const status = 1;
    const expected = {
      id: 1,
      description: "Active",
      tagColor: "green",
      changedOn: null,
    };

    const result = mapUserStatus(status);
    expect(result).toEqual(expected);
  });

  const testCases = [
    [
      -2,
      null,
      {
        id: -2,
        description: "Deactivated Invitation",
        tagColor: "orange",
        changedOn: null,
      },
    ],
    [
      -1,
      null,
      { id: -1, description: "Invited", tagColor: "blue", changedOn: null },
    ],
    [
      0,
      null,
      { id: 0, description: "Deactivated", tagColor: "red", changedOn: null },
    ],
    [
      1,
      null,
      { id: 1, description: "Active", tagColor: "green", changedOn: null },
    ],
    [
      99,
      null,
      { id: 99, description: "Unknown", tagColor: "grey", changedOn: null },
    ],
  ];

  it.each(testCases)(
    "should return the correct status object for statusId %d",
    (statusId, changedOn, expected) => {
      const result = mapUserStatus(statusId, changedOn);
      expect(result).toEqual(expected);
    },
  );

  it("should include the changedOn date when provided", () => {
    const status = 1;
    const changedOn = "2023-10-01";
    const expected = {
      id: 1,
      description: "Active",
      tagColor: "green",
      changedOn,
    };

    const result = mapUserStatus(status, changedOn);

    expect(result).toEqual(expected);
  });
});
