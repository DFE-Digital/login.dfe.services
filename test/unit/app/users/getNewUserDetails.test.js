const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/logger', () => require('./../../../utils/jestMocks').mockLogger());

jest.mock('./../../../../src/infrastructure/organisations', () => {
  return {
    getOrganisationAndServiceForUser: jest.fn(),
    getOrganisationAndServiceForInvitation: jest.fn(),
  };
});

describe('when displaying the user details view', () => {

  let req;
  let res;

  let getNewUserDetails;

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
    res = mockResponse();


    getNewUserDetails = require('./../../../../src/app/users/newUserDetails').get;
  });

  it('then it should return the user details view', async () => {
    await getNewUserDetails(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/newUserDetails');
  });

  it('then it should include csrf token', async () => {
    await getNewUserDetails(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });

  it('then it should include first name', async () => {
    await getNewUserDetails(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      firstName: 'test',
    });
  });

  it('then it should include last name', async () => {
    await getNewUserDetails(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      lastName: 'name',
    });
  });

  it('then it should include email', async () => {
    await getNewUserDetails(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      email: 'test@test.com',
    });
  });

  it('then it should include the organisation id', async () => {
    await getNewUserDetails(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      organisationId: 'org1',
    });
  });

});
