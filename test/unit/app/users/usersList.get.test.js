const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => {
  return {
    organisations: {
      type: 'static',
    },
  };
});

const { get } = require('./../../../../src/app/users/usersList');

describe('when displaying a list of users for an organisation', () => {

  let req;
  let res;

  let usersResult;

  beforeEach(() => {

  });


});
