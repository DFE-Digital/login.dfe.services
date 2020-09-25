jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());

const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
const { get } = require('./../../../../src/app/requestOrganisation/selectOrganisation');

const res = mockResponse();

describe('when showing the search for organisation page', () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      user: {
        sub: 'user1',
      },
      body: {
        criteria: 'organisation one',
        page: 2,
      },
      method: 'POST',
    });

    res.mockResetAll();
  });

  it('then it should display the select organisation search page', async () => {
    await get(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('requestOrganisation/views/search');
  });

  it('then it should include csrf token', async () => {
    await get(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });
});
