jest.mock('request-promise');
jest.mock('login.dfe.jwt-strategies');
jest.mock('./../../../../../src/infrastructure/config', () => {
  return {
    directories: {
      service: {
        url: 'http://unit.test.local',
      },
    },
  };
});

describe('When getting a collection of users', () => {
  const user = { sub: 'user1', email: 'user.one@unit.test' };
  const users = [{ sub: 'user1', email: 'user.one@unit.test' }, { sub: 'user2', email: 'user.two@unit.test' }];
  const userIds = ['user1', 'user2'];

  let account;
  let getBearerToken;
  let rp;

  beforeEach(() => {
    getBearerToken = jest.fn().mockReturnValue('token');
    const jwtStrategy = require('login.dfe.jwt-strategies');
    jwtStrategy.mockImplementation(() => ({
      getBearerToken,
    }));

    rp = jest.fn();
    const requestPromise = require('request-promise');
    requestPromise.mockImplementation(rp);

    const Account = require('./../../../../../src/infrastructure/account/DirectoriesApiAccount');
    account = Account.fromContext(user);
  });

  it('then it should get users in the directories api', async () => {
    await account.getUsersById(userIds);

    expect(rp.mock.calls).toHaveLength(1);
    expect(rp.mock.calls[0][0].method).toBe('GET');
    expect(rp.mock.calls[0][0].uri).toBe('http://unit.test.local/users/by-ids?id=user1,user2');
  });

  it('then it should authorize api using jwt strategy', async () => {
    await account.getUsersById(userIds);

    expect(getBearerToken.mock.calls).toHaveLength(1);
    expect(rp.mock.calls[0][0].headers.authorization).toBe('bearer token');
  });

  it('then it should return a list of users', async () => {
    rp.mockImplementation(() => (
      users
    ));

    const actual = await account.getUsersById(userIds);

    expect(actual).toBe(users);
  });

  it('then it should reject if password change fails', async () => {
    rp.mockImplementation(() => {
      const error = new Error('Unit test');
      error.statusCode = 401;
      throw error;
    });

    await expect(account.getUsersById(userIds)).rejects.toBeDefined();
  });
});
