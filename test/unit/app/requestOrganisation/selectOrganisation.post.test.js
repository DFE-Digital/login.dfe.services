jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/organisations');

const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
const { post } = require('./../../../../src/app/requestOrganisation/selectOrganisation');
const { searchOrganisations } = require('./../../../../src/infrastructure/organisations');

const res = mockResponse();

describe('when showing the searching for a organisation', () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      user: {
        sub: 'user1',
      },
      body: {
        criteria: 'organisation one',
        page: 1,
      },
      method: 'POST',
    });

    searchOrganisations.mockReset().mockReturnValue({
      organisations: [
        { id: 'org1' },
      ],
      totalNumberOfPages: 2,
      totalNumberOfRecords: 49,
      page: 1,
    });

    res.mockResetAll();
  });

  it('then it should use criteria and page to search for organisations', async () => {
    await post(req, res);

    expect(searchOrganisations.mock.calls).toHaveLength(1);
    expect(searchOrganisations.mock.calls[0][0]).toBe('organisation one');
    expect(searchOrganisations.mock.calls[0][1]).toBe(1);
    expect(searchOrganisations.mock.calls[0][2]).toBeUndefined();
    expect(searchOrganisations.mock.calls[0][3]).toBeUndefined();
    expect(searchOrganisations.mock.calls[0][4]).toBe('correlationId');
  });

  it('then it should render search view with results', async () => {
    await post(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('requestOrganisation/views/search');
    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
      criteria: 'organisation one',
      organisations: [{
        id: 'org1',
      }],
      page: 1,
      totalNumberOfPages: 2,
      totalNumberOfRecords: 49,
      backLink: true
    });
  });

  it('then it should update session with selected organisation', async () => {
    req.body = {
      selectedOrganisation: 'org1',
    };

    await post(req, res);

    expect(req.session.organisationId).toBe('org1');
  });

  it('then it should redirect to review page if organisation selected', async () => {
    req.body = {
      selectedOrganisation: 'org1',
    };

    await post(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe('review');
    expect(res.render.mock.calls).toHaveLength(0);
    expect(searchOrganisations.mock.calls).toHaveLength(0);
  });
});
