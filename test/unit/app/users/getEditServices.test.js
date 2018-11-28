const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('login.dfe.policy-engine');

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());

jest.mock('./../../../../src/app/users/utils');
const { getSingleServiceForUser } = require('./../../../../src/app/users/utils');


describe('when displaying the edit service view', () => {

  let req;
  let res;

  let getEditService;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
      sid: 'service1',
    };
    req.session = {
      user: {
        email: 'test@test.com',
        firstName: 'test',
        lastName: 'name',
      },
    };
    req.user = {
      sub: 'user1',
      email: 'user.one@unit.test',
      organisations: [{
        organisation: {
          id: 'organisationId',
          name: 'organisationName',
        },
        role: {
          id: 0,
          name: 'category name'
        }
      }],
    };
    req.userOrganisations = [{
      organisation: {
        id: 'organisationId',
        name: 'organisationName',
      },
      role: {
        id: 0,
        name: 'category name'
      }
    }];
    res = mockResponse();


    getSingleServiceForUser.mockReset();
    getSingleServiceForUser.mockReturnValue({
      id: 'service1',
      dateActivated: '10/10/2018',
      name: 'service name',
      status: 'active',
    });

    getEditService = require('./../../../../src/app/users/editServices').get;
  });

  it('then it should get the selected user service', async () => {
    await getEditService(req, res);

    expect(getSingleServiceForUser.mock.calls).toHaveLength(1);
    expect(getSingleServiceForUser.mock.calls[0][0]).toBe('user1');
    expect(getSingleServiceForUser.mock.calls[0][1]).toBe('org1');
    expect(getSingleServiceForUser.mock.calls[0][2]).toBe('service1');
    expect(getSingleServiceForUser.mock.calls[0][3]).toBe('correlationId');
  });

  it('then it should return the edit service view', async () => {
    await getEditService(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/editServices');
  });

  it('then it should include csrf token', async () => {
    await getEditService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });

  it('then it should include the organisation details', async () => {
    await getEditService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      organisationDetails: req.organisationDetails,
    });
  });

  it('then it should include the service details', async () => {
    await getEditService(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      service: getSingleServiceForUser(),
    });
  });

});
