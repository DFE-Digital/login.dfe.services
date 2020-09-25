const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => {
  return {
    organisations: {
      type: 'static',
    },
  };
});
jest.mock('./../../../../src/infrastructure/logger', () => ({
  audit: jest.fn(),
}));

jest.mock('./../../../../src/infrastructure/account', () => ({
  fromContext: jest.fn(),
  getUsersById: jest.fn(),
}));

jest.mock('./../../../../src/infrastructure/logger', () => ({
  audit: jest.fn(),
}));

const Account = require('./../../../../src/infrastructure/account');

describe('when displaying the users for approval', () => {
  let usersForApproval = [
    {
      org_id: '0a0410ba-f896-4c2b-aa08-6337a0d3db2e',
      org_name: 'Academisation and free schools self service',
      user_id: 'user1',
    },
    {
      org_id: '0a0410ba-f896-4c2b-aa08-6337a0d3db2e',
      org_name: 'Academisation and free schools self service',
      user_id: 'user9',
    },
  ];

  let req;
  let res;
  let getOrganisationUsersForApproval;

  let getAccessRequests;

  beforeEach(() => {
    req = mockRequest();
    req.user = {
      sub: 'user1',
      email: 'user.one@unit.test',
    };
    res = mockResponse();

    getOrganisationUsersForApproval = jest.fn().mockReturnValue(usersForApproval);
    const orgApi = require('./../../../../src/infrastructure/organisations');
    orgApi.getOrganisationUsersForApproval = getOrganisationUsersForApproval;

    Account.getUsersById
      .mockReset()
      .mockReturnValue([
        { claims: { sub: 'user1', given_name: 'User', family_name: 'One', email: 'user.one@unit.tests' } },
        { claims: { sub: 'user6', given_name: 'User', family_name: 'Six', email: 'user.six@unit.tests' } },
        { claims: { sub: 'user11', given_name: 'User', family_name: 'Eleven', email: 'user.eleven@unit.tests' } },
      ]);

    getAccessRequests = require('./../../../../src/app/accessRequests/accessRequests').get;
  });

  it('then it should return the requests view', async () => {
    await getAccessRequests(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('accessRequests/views/requests');
  });

  it('then it should include the user approvals for the user with user details found', async () => {
    await getAccessRequests(req, res);

    usersForApproval[0].usersName = 'User One';
    usersForApproval[0].usersEmail = 'user.one@unit.tests';
    usersForApproval[1].usersName = 'No Name Supplied';
    usersForApproval[1].usersEmail = '';
    expect(Account.getUsersById.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][1].usersForApproval).toEqual(usersForApproval);
  });
});
