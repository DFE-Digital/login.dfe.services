jest.mock('./../../../../src/infrastructure/organisations', () => ({
  getOrganisationAndServiceForUser: jest.fn(),
}));
jest.mock('./../../../../src/infrastructure/account', () => ({
  fromContext: jest.fn(),
  getUsersById: jest.fn(),
}));

const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
const { getOrganisationAndServiceForUser } = require('./../../../../src/infrastructure/organisations');
const Account = require('./../../../../src/infrastructure/account');
const home = require('./../../../../src/app/home/home');

const res = mockResponse();
const orgsAndServicesForUser = [
  {
    organisation: {
      id: 'org1',
      name: 'Organisation One',
      urn: '45619413'
    },
    role: {
      id: 10000,
      name: 'Approver',
    },
    approvers: [
      'user6',
      'user11',
      'user1',
    ],
    services: [
      {
        id: 'svc1',
        name: 'Service 1',
        description: 'first service',
        externalIdentifiers: [],
        requestDate: '2018-03-05T11:27:08.560Z',
        status: 1,
      },
    ],
  },
];

describe('when displaying current organisation and service mapping', () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      user: {
        sub: 'user1',
      },
    });

    res.mockResetAll();

    getOrganisationAndServiceForUser.mockReset().mockReturnValue(orgsAndServicesForUser);

    Account.fromContext.mockReset().mockReturnValue({
      id: 'user1',
    });
    Account.getUsersById.mockReset().mockReturnValue([
      { id: 'user1', name: 'User One', email: 'user.one@unit.tests' },
      { id: 'user6', name: 'User Six', email: 'user.six@unit.tests' },
      { id: 'user11', name: 'User Eleven', email: 'user.eleven@unit.tests' },
    ]);
  });

  it('then it should render home view', async () => {
    await home(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('home/views/home');
  });

  it('then it should include current user account in model', async () => {
    await home(req, res);

    expect(res.render.mock.calls[0][1].user).toBeDefined();
    expect(res.render.mock.calls[0][1].user).toEqual({
      id: 'user1',
    });
  });

  it('then it should include mapped organisations and services for user', async () => {
    await home(req, res);

    expect(res.render.mock.calls[0][1].organisations).toBeDefined();
    expect(res.render.mock.calls[0][1].organisations).toEqual([
      {
        id: 'org1',
        name: 'Organisation One',
        urn: '45619413',
        role: {
          id: 10000,
          name: 'Approver',
        },
        approvers: [
          { id: 'user6', name: 'User Six', email: 'user.six@unit.tests' },
          { id: 'user11', name: 'User Eleven', email: 'user.eleven@unit.tests' },
          { id: 'user1', name: 'User One', email: 'user.one@unit.tests' },
        ],
        services: [
          {
            id: 'svc1',
            name: 'Service 1',
            description: 'first service',
            externalIdentifiers: [],
            requestDate: '2018-03-05T11:27:08.560Z',
            status: 1,
          },
        ],
      }
    ]);
  });
});
