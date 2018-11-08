const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => {
  return {
    organisations: {
      type: 'static',
    },
  };
});

describe('when selecting an organisation', () => {

  let req;
  let res;

  let postMultipleOrgSelection;

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
    req.body = {
      selectedOrganisation: 'organisationId',
    };
    res = mockResponse();
    postMultipleOrgSelection = require('./../../../../src/app/users/selectOrganisation').post;
  });

  it('then it should redirect to the selected organisation', async () => {
    await postMultipleOrgSelection(req, res);
    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.body.selectedOrganisation}/users`);
  });

  it('then it should render validation message if no selected organisation', async () => {
    req.body.selectedOrganisation = undefined;

    await postMultipleOrgSelection(req, res);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(`users/views/selectOrganisation`);
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: 'token',
      selectedOrganisation: undefined,
      organisations: req.userOrganisations,
      currentPage: 'users',
      validationMessages: {
        selectedOrganisation: 'Please select an organisation',
      },
    });
  });

});
