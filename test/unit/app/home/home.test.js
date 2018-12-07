jest.mock('./../../../../src/infrastructure/account', () => ({
  fromContext: jest.fn(),
  getUsersById: jest.fn(),
}));
jest.mock('./../../../../src/infrastructure/applications', () => ({
  getAllServices: jest.fn(),
}));

const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
const Account = require('./../../../../src/infrastructure/account');
const { getAllServices } = require('./../../../../src/infrastructure/applications');
const home = require('./../../../../src/app/home/home');

const res = mockResponse();


describe('when displaying current organisation and service mapping', () => {
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


    getAllServices.mockReset().mockReturnValue({
      services: [
        {
          id: 'Service One',
          name: 'Service One',
          description: 'service description',
          isExternalService: true,
          isMigrated: true,
          relyingParty: {
            service_home: 'http://service.one/login',
            redirect_uris: [
              'http://service.one/login/cb'
            ],
          },
        }
        ]
    });
  });

  it('then it should render landing page if not logged in', async () => {
    await home(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('home/views/landingPage');
  });

  it('then it should include services in model', async () => {
    await home(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][1].services).toBeDefined();
    expect(res.render.mock.calls[0][1].services).toEqual(
      [
        {
          id: 'Service One',
          isExternalService: true,
          isMigrated: true,
          name: 'Service One',
        }
        ]
    )
  });


});
