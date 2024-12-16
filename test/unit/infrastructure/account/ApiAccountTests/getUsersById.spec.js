const { mockAdapterConfig } = require("../../../../utils/jestMocks");

jest.mock("./../../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});
jest.mock("login.dfe.dao", () => {
  return {
    directories: {
      getUsers: async (ids) => {
        return [
          {
            email: "kevin.lewis@hq.local",
            sub: "F47D8673-8861-4A95-8286-000403EED219",
          },
          {
            email: "another.person@hq.local",
            sub: "A14B8673-7752-4A95-8286-000403CCD912",
          },
        ];
      },
    },
  };
});

describe("When getting a collection of users - getUsersById", () => {
  const userIds = [
    "F47D8673-8861-4A95-8286-000403EED219",
    "A14B8673-7752-4A95-8286-000403CCD912",
  ];
  const users = [
    {
      email: "kevin.lewis@hq.local",
      sub: "F47D8673-8861-4A95-8286-000403EED219",
    },
    {
      email: "another.person@hq.local",
      sub: "A14B8673-7752-4A95-8286-000403CCD912",
    },
  ];

  let Account;

  beforeEach(() => {
    Account = require("./../../../../../src/infrastructure/account/DirectoriesApiAccount");
  });

  it("should get correct users", async () => {
    let result = await Account.getUsersById(userIds);
    expect(result).toHaveLength(2);
    expect(result).toEqual([new Account(users[0]), new Account(users[1])]);
    expect(result[0].claims.sub).toBe("F47D8673-8861-4A95-8286-000403EED219");
    expect(result[1].claims.sub).toBe("A14B8673-7752-4A95-8286-000403CCD912");
  });
});
