jest.mock('./../../../../src/infrastructure/organisations', () => ({
  getOrganisationAndServiceForUser: jest.fn(),
}));
jest.mock('./../../../../src/infrastructure/hotConfig', () => ({
  getOidcClients: jest.fn(),
}));
jest.mock('./../../../../src/infrastructure/account', () => ({
  fromContext: jest.fn(),
  getUsersById: jest.fn(),
}));

const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
const { getOrganisationAndServiceForUser } = require('./../../../../src/infrastructure/organisations');
const { getOidcClients } = require('./../../../../src/infrastructure/hotConfig');
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
  {
    organisation: {
      id: 'org2',
      name: 'Organisation Two',
      uid: '543181665'
    },
    role: {
      id: 0,
      name: 'End User',
    },
    approvers: [],
    services: [],
  },
];
const oidcClients = [
  {
    friendlyName: 'Service 1',
    client_id: 'service_one',
    redirect_uris: ['http://service.one/login'],
    params: {
      serviceId: 'svc1',
    },
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

    getOidcClients.mockReset().mockReturnValue(oidcClients);

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

  it('then it should include mapped services for user', async () => {
    await home(req, res);

    expect(res.render.mock.calls[0][1].services).toBeDefined();
    expect(res.render.mock.calls[0][1].services).toHaveLength(1);
    expect(res.render.mock.calls[0][1].services[0]).toEqual({
            id: 'svc1',
            name: 'Service 1',
            description: 'first service',
            externalIdentifiers: [],
            requestDate: '2018-03-05T11:27:08.560Z',
            status: 1,
            serviceUrl: 'http://service.one/login',
      });
  });
});
