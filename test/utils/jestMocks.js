'use strict';

const mockRequest = () => {
  return {
    params: {
      uuid: '123-abc',
    },
    session: {},
    body: {},
    query: {},
    csrfToken: jest.fn().mockReturnValue('token'),
  };
};
const mockResponse = () => {
  return {
    render: jest.fn(),
    redirect: jest.fn(),
    mockResetAll: function () {
      this.render.mockReset().mockReturnValue(this);
      this.redirect.mockReset().mockReturnValue(this);
    }
  };
};

module.exports = {
  mockRequest,
  mockResponse
};
