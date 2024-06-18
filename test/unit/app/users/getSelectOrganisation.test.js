const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());

jest.mock('login.dfe.dao', () => {
  return {
    directories: {
      fetchUserBanners: async (_userId, _bannerId) => {
        return null
      },
      createUserBanners: async (_userId, _bannerId) => {
        return Promise.resolve(true)
      }
    }
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
      organisations: [
        {
          organisation: {
            id: 'organisationId',
            name: 'organisationName',
          },
          role: {
            id: 0,
            name: 'category name',
          },
        },
      ],
    };
    req.userOrganisations = [
      {
        organisation: {
          id: 'organisationId',
          name: 'organisationName',
        },
        role: {
          id: 0,
          name: 'category name',
        },
      },
    ];
    req.session = {
      user: {},
    };
    res = mockResponse();

    getMultipleOrgSelection = require('./../../../../src/app/users/selectOrganisation').get;
  });

  it('then it should return the multiple orgs view', async () => {
    await getMultipleOrgSelection(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/selectOrganisationRedesigned');
  });

  it('then it should include csrf token in model', async () => {
    await getMultipleOrgSelection(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: 'token',
    });
  });
});

// // Mock functions for the conditions
// const isRequestService = jest.fn();
// const isUserApprover = jest.fn();
// const isOrganisationInvite = jest.fn();

// describe('when displaying organisation selection for different user actions', () => {
//   beforeEach(() => {
//     // Reset mock functions before each test
//     isRequestService.mockReset();
//     isUserApprover.mockReset();
//     isOrganisationInvite.mockReset();
//   });

//   it('should return message for requesting access to a service', () => {
//     isRequestService.mockReturnValue(true);
//     isUserApprover.mockReturnValue(false);
//     isOrganisationInvite.mockReturnValue(false);

//     const req = {};
//     const result = buildSubHeader(req);
//     expect(result).toBe('You are associated with more than 1 organisation. Select the organisation associated with the service you would like to request access to.');
//   });

//   it('should return message for user approver', () => {
//     isRequestService.mockReturnValue(false);
//     isUserApprover.mockReturnValue(true);
//     isOrganisationInvite.mockReturnValue(false);

//     const req = {};
//     const result = buildSubHeader(req);
//     expect(result).toBe('You are associated with more than 1 organisation. Select the organisation associated with the service you would like to request access to.');
//   });

//   it('should return message for inviting another user', () => {
//     isRequestService.mockReturnValue(false);
//     isUserApprover.mockReturnValue(false);
//     isOrganisationInvite.mockReturnValue(true);

//     const req = {};
//     const result = buildSubHeader(req);
//     expect(result).toBe('You are associated with more than 1 organisation. Select the organisation you would like to invite another user to.');
//   });

//   it('should return message for signing in', () => {
//     isRequestService.mockReturnValue(false);
//     isUserApprover.mockReturnValue(false);
//     isOrganisationInvite.mockReturnValue(false);

//     const req = {};
//     const result = buildSubHeader(req);
//     expect(result).toBe('You are associated with more than 1 organisation. Select the organisation you would like to sign-in with.');
//   });
// });

