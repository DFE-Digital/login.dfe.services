const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/logger', () => ({
  audit: jest.fn(),
}));

jest.mock('./../../../../src/infrastructure/config', () => {
  return {
    organisations: {
      type: 'static',
    },
  };
});

jest.mock('./../../../../src/infrastructure/account', () => ({
  fromContext: jest.fn(),
  getUsersById: jest.fn(),
}));

jest.mock('./../../../../src/infrastructure/organisations', () => ({
  putUserInOrganisation: jest.fn(),
}));

const Account = require('./../../../../src/infrastructure/account');
const logger = require('./../../../../src/infrastructure/logger');

describe('when approving users', () => {
  let req;
  let res;

  let postAccessRequests;
  const { putUserInOrganisation } = require('./../../../../src/infrastructure/organisations');

  beforeEach(() => {
    req = mockRequest();
    req.user = {
      sub: 'user1',
      email: 'user.one@unit.test',
    };
    req.body = {
      user_Id: 'user-123',
      org_id: 'org-123',
      approve_reject: 'Approve',
      role: 'Approver',
      message: '',
    };
    res = mockResponse();

    putUserInOrganisation.mockReset().mockReturnValue();

    Account.getUsersById
      .mockReset()
      .mockReturnValue([
        { claims: { sub: 'user1', given_name: 'User', family_name: 'One', email: 'user.one@unit.tests' } },
        { claims: { sub: 'user6', given_name: 'User', family_name: 'Six', email: 'user.six@unit.tests' } },
        { claims: { sub: 'user11', given_name: 'User', family_name: 'Eleven', email: 'user.eleven@unit.tests' } },
      ]);

    postAccessRequests = require('./../../../../src/app/accessRequests/accessRequests').post;
  });

  it('then the API is called with the mapped values if approved and an approver and the request is audited', async () => {
    await postAccessRequests(req, res);

    expect(putUserInOrganisation.mock.calls).toHaveLength(1);
    expect(putUserInOrganisation.mock.calls[0][0]).toBe(req.body.user_id);
    expect(putUserInOrganisation.mock.calls[0][1]).toBe(req.body.org_id);
    expect(putUserInOrganisation.mock.calls[0][2]).toBe(1);
    expect(putUserInOrganisation.mock.calls[0][3]).toBe(10000);
    expect(putUserInOrganisation.mock.calls[0][4]).toBe('');
    expect(putUserInOrganisation.mock.calls[0][5]).toBe(req.id);
    expect(logger.audit.mock.calls).toHaveLength(1);
  });

  it('then the API is called with the mapped values if approved and an end user and the request is audited', async () => {
    req.body.role = 'end user';

    await postAccessRequests(req, res);

    expect(putUserInOrganisation.mock.calls).toHaveLength(1);
    expect(putUserInOrganisation.mock.calls[0][0]).toBe(req.body.user_id);
    expect(putUserInOrganisation.mock.calls[0][1]).toBe(req.body.org_id);
    expect(putUserInOrganisation.mock.calls[0][2]).toBe(1);
    expect(putUserInOrganisation.mock.calls[0][3]).toBe(1);
    expect(putUserInOrganisation.mock.calls[0][4]).toBe('');
    expect(putUserInOrganisation.mock.calls[0][5]).toBe(req.id);
    expect(logger.audit.mock.calls).toHaveLength(1);
  });

  it('then if the request is rejected the values are mapped correctly and the request is audited', async () => {
    req.body.approve_reject = 'Reject';
    req.body.message = 'rejected reason';

    await postAccessRequests(req, res);

    expect(putUserInOrganisation.mock.calls).toHaveLength(1);
    expect(putUserInOrganisation.mock.calls[0][0]).toBe(req.body.user_id);
    expect(putUserInOrganisation.mock.calls[0][1]).toBe(req.body.org_id);
    expect(putUserInOrganisation.mock.calls[0][2]).toBe(-1);
    expect(putUserInOrganisation.mock.calls[0][3]).toBe(0);
    expect(putUserInOrganisation.mock.calls[0][4]).toBe('rejected reason');
    expect(putUserInOrganisation.mock.calls[0][5]).toBe(req.id);
    expect(logger.audit.mock.calls).toHaveLength(1);
  });

  it('then it should redirect to the accessRequest', async () => {
    await postAccessRequests(req, res);

    expect(res.redirect.mock.calls.length).toBe(1);
    expect(res.redirect.mock.calls[0][0]).toBe('access-requests');
  });
});
