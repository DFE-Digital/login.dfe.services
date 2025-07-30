const { mockAdapterConfig } = require("../../../../utils/jestMocks");

jest.mock("login.dfe.async-retry", () => ({
  fetchApi: jest.fn(),
}));
jest.mock("./../../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});
const { fetchApi } = require("login.dfe.async-retry");
jest.mock("login.dfe.dao", () => {
  return {
    directories: {
      getUsers: async () => {
        return [
          {
            email: "kevin.lewis@hq.local",
            sub: "F47D8673-8861-4A95-8286-000403EED219",
          },
        ];
      },
      changePassword: async () => {
        return {
          email: "kevin.lewis@hq.local",
          sub: "F47D8673-8861-4A95-8286-000403EED219",
        };
      },
    },
  };
});

describe("When setting a users password", () => {
  const user = { sub: "user1", email: "user.one@unit.test" };
  const password = "new-password";

  let account;

  beforeEach(() => {
    fetchApi.mockReset();
    const Account = require("./../../../../../src/infrastructure/account/DirectoriesApiAccount");
    account = Account.fromContext(user);
  });

  it("then it should return if password change successfully", async () => {
    await expect(account.setPassword(password)).resolves.toBeDefined();
  });
});
