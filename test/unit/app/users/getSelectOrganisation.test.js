const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => {
  return {
    organisations: {
      type: 'static',
    },
  };
});

describe('when displaying the multiple organisation selection', () => {

  let req;
  let res;

  let getMultipleOrgSelection;

  beforeEach(() => {
    req = mockRequest();
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
    req.userOrganisations = {
      organisation: {
        id: 'organisationId',
        name: 'organisationName',
      },
      role: {
        id: 0,
        name: 'category name'
      }
    };
    res = mockResponse();

    getMultipleOrgSelection = require('./../../../../src/app/users/selectOrganisation').get;
  });

  it('then it should return the multiple orgs view', async () => {
    await getMultipleOrgSelection(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/selectOrganisation');
  });

  it('then it should include csrf token in model', async () => {
    await getMultipleOrgSelection(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });

});
