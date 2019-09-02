const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());

describe('when selecting an organisation to manage requests', () => {

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
    req.organisationRequests = [
      {
        id: 'requestId',
        org_id: 'organisationId',
        org_name: 'organisationName',
        user_id: 'user1',
        status: {
          id: 0,
          name: 'pending',
        }
      }
    ];
    req.body = {
      selectedOrganisation: 'organisationId',
    };
    res = mockResponse();
    postMultipleOrgSelection = require('./../../../../src/app/accessRequests/selectOrganisation').post;
  });

  it('then it should redirect to the selected organisation', async () => {
    await postMultipleOrgSelection(req, res);
    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/access-requests/${req.body.selectedOrganisation}`);
  });

  it('then it should render validation message if no selected organisation', async () => {
    req.body.selectedOrganisation = undefined;

    await postMultipleOrgSelection(req, res);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('accessRequests/views/selectOrganisation');
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: 'token',
      backLink: true,
      selectedOrganisation: undefined,
      organisations: req.userOrganisations,
      title: 'Select Organisation - DfE Sign-in',
      validationMessages: {
        selectedOrganisation: 'An organisation must be selected',
      },
    });
  });

});
