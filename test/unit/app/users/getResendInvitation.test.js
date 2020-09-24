const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());

describe('when displaying the resend invitation view', () => {
  let req;
  let res;

  let getResendInvitation;

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
        uid: 'userid',
      },
    };
    req.user = {
      sub: 'user1',
      email: 'user.one@unit.test',
      organisations: [
        {
          organisation: {
            id: 'organisationId',
            name: 'organisationName',
          },
          role: {
            id: 0,
            name: 'category name',
          },
        },
      ],
    };
    res = mockResponse();

    getResendInvitation = require('./../../../../src/app/users/resendInvitation').get;
  });

  it('then it should return the confirm resend invitation view', async () => {
    await getResendInvitation(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/confirmResendInvitation');
  });

  it('then it should include csrf token', async () => {
    await getResendInvitation(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });

  it('then it should include the users name', async () => {
    await getResendInvitation(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      user: {
        name: 'test name',
      },
    });
  });

  it('then it should include the users email address', async () => {
    await getResendInvitation(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      email: 'test@test.com',
    });
  });
});
