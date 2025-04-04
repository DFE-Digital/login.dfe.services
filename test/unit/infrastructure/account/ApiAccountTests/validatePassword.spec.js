const { mockAdapterConfig } = require("../../../../utils/jestMocks");

jest.mock("login.dfe.async-retry", () => ({
  fetchApi: jest.fn(),
}));
jest.mock("login.dfe.jwt-strategies");
jest.mock("./../../../../../src/infrastructure/config", () => {
  return mockAdapterConfig();
});
jest.mock("login.dfe.dao", () => {
  return {
    directories: {
      getUsers: async () => {
        return [
          {
            email: "test1@test.com",
            sub: "F47D8673-8861-4A95-8286-000403EED219",
          },
        ];
      },
    },
  };
});
const { fetchApi } = require("login.dfe.async-retry");

describe("When validating a users password", () => {
  const user = { email: "user.one@unit.test" };
  const password = "password";

  let account;
  let getBearerToken;

  beforeEach(() => {
    getBearerToken = jest.fn().mockReturnValue("token");
    const jwtStrategy = require("login.dfe.jwt-strategies");
    jwtStrategy.mockImplementation(() => ({
      getBearerToken,
    }));
    fetchApi.mockReset();

    const Account = require("./../../../../../src/infrastructure/account/DirectoriesApiAccount");
    account = Account.fromContext(user);
  });

  it("then it should authenticate user against directories api", async () => {
    await account.validatePassword(password);

    expect(fetchApi.mock.calls).toHaveLength(1);
    expect(fetchApi.mock.calls[0][0]).toBe(
      "http://unit.test.local/users/authenticate",
    );
    expect(fetchApi.mock.calls[0][1].method).toBe("POST");
    expect(fetchApi.mock.calls[0][1].body).toMatchObject({
      username: user.email,
      password,
    });
  });

  it("then it should authorize api using jwt strategy", async () => {
    await account.validatePassword(password);

    expect(getBearerToken.mock.calls).toHaveLength(1);
    expect(fetchApi.mock.calls[0][1].headers.authorization).toBe(
      "bearer token",
    );
  });

  it("then it should return true is password is valid", async () => {
    const result = await account.validatePassword(password);

    expect(result).toBe(true);
  });

  it("then it should return false when api returns error", async () => {
    fetchApi.mockImplementation(() => {
      const error = new Error("Unit test");
      error.statusCode = 401;
      throw error;
    });

    const result = await account.validatePassword(password);

    expect(result).toBe(false);
  });
});
