const { mockRequest, mockResponse } = require('../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('../../../utils/jestMocks').mockConfig());

const mockServiceOrganisations = [
  {
    Organisation: {
      id: 'organisationId',
      naturalIdentifiers: [],
      statusName: undefined,
    },
    Service: {
      id: 'serviceId',
    },
    id: 'serviceOrganisationId',
  },
];

jest.mock('login.dfe.dao', () => {
  return {
    organisation: {
      getStatusNameById: jest.fn(),
    },
    services: {
      getUserServicesWithOrganisationOnlyApprover: () => mockServiceOrganisations,
      getFilteredUserServicesWithOrganisation: () => mockServiceOrganisations
    },
  };
});

const dao = require('login.dfe.dao');

describe('when selecting a service (with organisation)', () => {
  let req;
  let res;

  let postSelectServiceWithOrg;

  beforeEach(() => {
    req = mockRequest();
    req.user = {
      sub: 'userId',
    };
    req.body = {
      selectedServiceOrganisation: 'serviceOrganisationId',
    };
    req.session = {
      user: {},
    };
    res = mockResponse();
    postSelectServiceWithOrg = require('../../../../src/app/users/selectServiceWithOrganisation').post;
  });

  it('then it should redirect to the selected service', async () => {
    await postSelectServiceWithOrg(req, res);
    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/organisationId/users/userId/services/serviceId`);
  });

  it('then it should render validation message if no selected service', async () => {
    req.body.selectedServiceOrganisation = undefined;

    await postSelectServiceWithOrg(req, res);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(`users/views/selectServiceWithOrganisation`);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
      selectedServiceOrganisation: undefined,
      serviceOrganisations: mockServiceOrganisations,
      currentPage: 'services',
      validationMessages: {
        serviceOrganisation: 'Please select a service',
      },
      backLink: '/my-services',
    });
  });
});
