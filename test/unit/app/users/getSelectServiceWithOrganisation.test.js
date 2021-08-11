const { mockRequest, mockResponse } = require('../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('../../../utils/jestMocks').mockConfig());

jest.mock('login.dfe.dao', () => {
  return {
    organisation: {
      getStatusNameById: jest.fn(),
    },
    services: {
      getUserServicesWithOrganisationOnlyApprover: () => [],
    },
  };
});

const dao = require('login.dfe.dao');

describe('when displaying the select service with organisation page', () => {
  let req;
  let res;

  let getServiceOrgSelection;

  beforeEach(() => {
    req = mockRequest();
    req.user = {
      sub: 'user1',
      email: 'user.one@unit.test',
    };
    req.session = {
      user: {},
    };
    req.query = {
      action: 'edit',
    };
    res = mockResponse();

    getServiceOrgSelection = require('../../../../src/app/users/selectServiceWithOrganisation').get;
  });

  it('then it should return the select service with orgs view', async () => {
    await getServiceOrgSelection(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/selectServiceWithOrganisation');
  });

  it('then it should include csrf token in model', async () => {
    await getServiceOrgSelection(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });

  it('then it should match expected model for edit action', async () => {
    await getServiceOrgSelection(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      currentPage: 'services',
      backLink: '/my-services',
      action: 'edit',
      title: 'Edit which service?',
    });
  });

  it('then it should match expected model for remove action', async () => {
    req.query.action = 'remove';
    await getServiceOrgSelection(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      currentPage: 'services',
      backLink: '/my-services',
      action: 'remove',
      title: 'Remove which service?',
    });
  });
});
