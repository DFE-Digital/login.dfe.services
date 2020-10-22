const { mockAdapterConfig } = require('../../../../utils/jestMocks');

jest.mock('login.dfe.request-promise-retry');
jest.mock('login.dfe.jwt-strategies');
jest.mock('./../../../../../src/infrastructure/config', () => {
  return mockAdapterConfig();
});
const rp = require('login.dfe.request-promise-retry');
jest.mock('login.dfe.dao', () => {
  return {
    directories: {
      getUsers: async (ids) => {
        return [
          {
            email: 'kevin.lewis@hq.local',
            sub: 'F47D8673-8861-4A95-8286-000403EED219',
          },
        ];
      },
    },
  };
});

describe('When getting a collection of users', () => {
  const user = { sub: 'user1', email: 'user.one@unit.test' };
  const users = [
    { sub: 'user1', email: 'user.one@unit.test' },
    { sub: 'user2', email: 'user.two@unit.test' },
  ];
  const userIds = ['user1', 'user2'];

  let Account;
  let getBearerToken;

  beforeEach(() => {
    getBearerToken = jest.fn().mockReturnValue('token');
    const jwtStrategy = require('login.dfe.jwt-strategies');
    jwtStrategy.mockImplementation(() => ({
      getBearerToken,
    }));

    rp.mockReset().mockReturnValue([]);

    Account = require('./../../../../../src/infrastructure/account/DirectoriesApiAccount');
  });

  it.only('then it should get users in the directories api', async () => {
    let result = await Account.getUsersById(userIds);
    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
  });

  it('then it should get correct user', async () => {
    let result = await Account.getUsersById(userIds);
    expect(result[0].sub).toBe('F47D8673-8861-4A95-8286-000403EED219');
  });

  it('then it should return a list of users', async () => {
    rp.mockImplementation(() => users);

    const actual = await Account.getUsersById(userIds);

    expect(actual).toEqual([new Account(users[0]), new Account(users[1])]);
  });

  it('then it should reject if password change fails', async () => {
    rp.mockImplementation(() => {
      const error = new Error('Unit test');
      error.statusCode = 401;
      throw error;
    });

    await expect(Account.getUsersById(userIds)).rejects.toBeDefined();
  });
});
