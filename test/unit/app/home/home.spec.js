const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
jest.mock('./../../../../src/infrastructure/config', () => {
    return {
      directories: {
        type: 'static',
      },
      organisations: {
        type: 'static',
      }
    };
});
jest.mock('./../../../../src/infrastructure/config');
jest.mock('./../../../../src/infrastructure/utils');

describe('when displaying the home page', () => {
  let req;
  let res;
  let utilsGetUserDisplayName;

  let home;

  beforeEach(() => {


    req = mockRequest();
    req.user = {
      sub: 'user1',
      email: 'user.one@unit.test',
    };
    res = mockResponse();
    res.locals = {};
    res.locals.user =  req.user
    res.locals.displayName = 'User One';

    utilsGetUserDisplayName = jest.fn().mockImplementation((user) => {
      if (user === req.user) {
        return 'User One';
      }
      return '';
    });
    const utils = require('./../../../../src/infrastructure/utils');
    utils.getUserDisplayName = utilsGetUserDisplayName;

    home = require('./../../../../src/app/home/home');
  });

  it('then it should return the home view', async () => {
    await home(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('home/views/home');
  });

  // it.skip('then it should include the users display name', async () => {
  //   await home(req, res);
  //
  //   expect(res.render.mock.calls[0][1].displayName).toBe('User One');
  // });
  //
  // it.skip('then it should include the full user', async () => {
  //   await home(req, res);
  //
  //   expect(res.render.mock.calls[0][1].user).toBe(req.user);
  // });
});
