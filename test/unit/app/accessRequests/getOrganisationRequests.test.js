const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());

jest.mock('./../../../../src/infrastructure/account', () => ({
  fromContext: jest.fn(),
  getUsersById: jest.fn(),
}));

jest.mock('./../../../../src/infrastructure/organisations', () => ({
  getRequestsForOrganisations: jest.fn(),
}));

const Account = require('./../../../../src/infrastructure/account');
const { getRequestsForOrganisations } = require('./../../../../src/infrastructure/organisations');

describe('when displaying the requests for an organisation', () => {
  let req;
  let res;

  let getOrganisationRequests;

  beforeEach(() => {
    req = mockRequest();
    req.user = {
      sub: 'user1',
      email: 'user.one@unit.test',
    };
    req.userOrganisations = [
      {
        organisation: {
          id: 'organisationId',
          name: 'organisationName',
        },
        role: {
          id: 10000,
          name: 'category name',
        },
      },
    ];
    req.organisationRequests = [
      {
        id: 'requestId',
        org_id: 'organisationId',
        org_name: 'organisationName',
        user_id: 'user1',
        status: {
          id: 0,
          name: 'pending',
        },
      },
    ];
    res = mockResponse();

    getRequestsForOrganisations.mockReset();
    getRequestsForOrganisations.mockReturnValue([
      {
        id: 'requestId',
        org_id: 'organisationId',
        org_name: 'organisationName',
        user_id: 'user1',
        status: {
          id: 0,
          name: 'pending',
        },
        created_date: '2019-08-12',
      },
    ]);

    Account.getUsersById
      .mockReset()
      .mockReturnValue([
        { claims: { sub: 'user1', given_name: 'User', family_name: 'One', email: 'user.one@unit.tests' } },
        { claims: { sub: 'user6', given_name: 'User', family_name: 'Six', email: 'user.six@unit.tests' } },
        { claims: { sub: 'user11', given_name: 'User', family_name: 'Eleven', email: 'user.eleven@unit.tests' } },
      ]);

    getOrganisationRequests = require('./../../../../src/app/accessRequests/getOrganisationRequests');
  });

  it('then it should get requests for organisation', async () => {
    await getOrganisationRequests(req, res);

    expect(getRequestsForOrganisations.mock.calls).toHaveLength(1);
    expect(getRequestsForOrganisations.mock.calls[0][0]).toBe(encodeURIComponent('organisationId'));
    expect(getRequestsForOrganisations.mock.calls[0][1]).toBe('correlationId');
  });

  it('then it should include the user requests with the user details', async () => {
    await getOrganisationRequests(req, res);

    expect(Account.getUsersById.mock.calls).toHaveLength(1);
    expect(Account.getUsersById.mock.calls[0][0]).toEqual(['user1']);
  });

  it('then it should return the organisation requests view', async () => {
    await getOrganisationRequests(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('accessRequests/views/organisationRequests');
  });

  it('then it should include the org details', async () => {
    await getOrganisationRequests(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      organisation: {
        id: 'organisationId',
        name: 'organisationName',
      },
    });
  });

  it('then it should include the mapped request details', async () => {
    await getOrganisationRequests(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      requests: [
        {
          id: 'requestId',
          org_id: 'organisationId',
          org_name: 'organisationName',
          status: {
            id: 0,
            name: 'pending',
          },
          user_id: 'user1',
          created_date: '2019-08-12',
        },
      ],
    });
  });
});
