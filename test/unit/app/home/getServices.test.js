jest.mock('./../../../../src/infrastructure/account', () => ({
  fromContext: jest.fn(),
  getUsersById: jest.fn(),
}));
jest.mock('./../../../../src/infrastructure/applications', () => ({
  getApplication: jest.fn(),
}));

jest.mock('./../../../../src/infrastructure/access', () => ({
  getServicesForUser: jest.fn(),
}));

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());


const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
const Account = require('./../../../../src/infrastructure/account');
const { getServicesForUser } = require('./../../../../src/infrastructure/access');
const { getApplication } = require('./../../../../src/infrastructure/applications');
const getServices = require('./../../../../src/app/home/getServices');

const res = mockResponse();
const userAccess = [
  { serviceId: 'service1' }
];
const application = {
  name: 'Service One',
  relyingParty: {
    service_home: 'http://service.one/login',
    redirect_uris: [
      'http://service.one/login/cb'
    ],
  },
};

describe('when displaying the users services', () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      user: {
        sub: 'user1',
      },
    });

    res.mockResetAll();

    Account.fromContext.mockReset().mockReturnValue({
      id: 'user1',
    });

    getServicesForUser.mockReset().mockReturnValue(userAccess);

    getApplication.mockReset().mockReturnValue(application);
  });

  it('then it should render the logged in services view', async () => {
    await getServices(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('home/views/services');
  });

  it('then it should include current user account in model', async () => {
    await getServices(req, res);

    expect(res.render.mock.calls[0][1].user).toBeDefined();
    expect(res.render.mock.calls[0][1].user).toEqual({
      id: 'user1',
    });
  });

  it('then it should include mapped services for user', async () => {
    await getServices(req, res);

    expect(res.render.mock.calls[0][1].services).toBeDefined();
    expect(res.render.mock.calls[0][1].services).toHaveLength(1);
    expect(res.render.mock.calls[0][1].services[0]).toEqual({
      id: 'service1',
      name: 'Service One',
      serviceUrl: 'http://service.one/login',
    });
  });

  it('then it should render services view with no services if user has none', async () => {
    getServicesForUser.mockReturnValue(undefined);

    await getServices(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('home/views/services');
    expect(res.render.mock.calls[0][1].services).toBeDefined();
    expect(res.render.mock.calls[0][1].services).toHaveLength(0);
  });

  it('then it should map serviceUrl from service_home when available', async () => {
    getApplication.mockReset().mockReturnValue({
      name: 'Service One',
      relyingParty: {
        service_home: 'http://service.one/login',
        redirect_uris: [
          'http://service.one/login/cb'
        ],
      },
    });

    await getServices(req, res);

    expect(res.render.mock.calls[0][1].services[0].serviceUrl).toBe('http://service.one/login');
  });

  it('then it should map serviceUrl from first redirect if service_home not available', async () => {
    getApplication.mockReset().mockReturnValue({
      name: 'Service One',
      relyingParty: {
        redirect_uris: [
          'http://service.one/login/cb'
        ],
      },
    });

    await getServices(req, res);

    expect(res.render.mock.calls[0][1].services[0].serviceUrl).toBe('http://service.one/login/cb');
  });


  it('then it should set serviceUrl to # if no service_home or redirects available', async () => {
    getApplication.mockReset().mockReturnValue({
      name: 'Service One',
      relyingParty: {
        redirect_uris: [],
      },
    });

    await getServices(req, res);

    expect(res.render.mock.calls[0][1].services[0].serviceUrl).toBe('#');
  });
});
