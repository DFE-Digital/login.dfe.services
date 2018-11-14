const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => {
  return {
    organisations: {
      type: 'static',
    },
    access: {
      type: 'static',
    },
    search: {
      type: 'static',
    },
    applications: {
      type: 'static',
    },
  };
});

jest.mock('./../../../../src/infrastructure/organisations', () => {
  return {
    deleteInvitationOrganisation: jest.fn(),
    deleteUserOrganisation: jest.fn(),
  };
});

jest.mock('./../../../../src/infrastructure/logger', () => {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    audit: jest.fn(),
  };
});

jest.mock('./../../../../src/app/users/utils');

const logger = require('./../../../../src/infrastructure/logger');
const { getUserDetails, getAllServicesForUserInOrg } = require('./../../../../src/app/users/utils');
const { deleteInvitationOrganisation, deleteUserOrganisation } = require('./../../../../src/infrastructure/organisations');

describe('when removing organisation access', () => {

  let req;
  let res;

  let postRemoveOrganisationAccess;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
    };
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
        id: 'org1',
        name: 'organisationName',
      },
      role: {
        id: 0,
        name: 'category name'
      }
    }];
    req.body = {
      selectedOrganisation: 'organisationId',
    };

    getUserDetails.mockReset();
    getUserDetails.mockReturnValue({
      id: 'user1',
      email: 'email@email.com'
    });

    res = mockResponse();
    postRemoveOrganisationAccess = require('./../../../../src/app/users/removeOrganisationAccess').post;
  });

  it('then it should delete org for invitation if request for invitation', async () => {
    req.params.uid = 'inv-invite1';

    await postRemoveOrganisationAccess(req, res);

    expect(deleteInvitationOrganisation.mock.calls).toHaveLength(1);
    expect(deleteInvitationOrganisation.mock.calls[0][0]).toBe('invite1');
    expect(deleteInvitationOrganisation.mock.calls[0][1]).toBe('org1');
  });

  it('then it should delete org for user', async () => {

    await postRemoveOrganisationAccess(req, res);

    expect(deleteUserOrganisation.mock.calls).toHaveLength(1);
    expect(deleteUserOrganisation.mock.calls[0][0]).toBe('user1');
    expect(deleteUserOrganisation.mock.calls[0][1]).toBe('org1');
  });

  it('then it should should audit user being removed from org', async () => {
    await postRemoveOrganisationAccess(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0]).toBe('user.one@unit.test (id: user1) removed organisation organisationName (id: org1) for user email@email.com (id: user1)');
    expect(logger.audit.mock.calls[0][1]).toMatchObject({
      type: 'approver',
      subType: 'user-org-deleted',
      userId: 'user1',
      userEmail: 'user.one@unit.test',
      editedUser: 'user1',
      editedFields: [
        {
          name: 'new_organisation',
          oldValue: 'org1',
          newValue: undefined,
        }
      ],
    });
  });

  it('then it should redirect to organisations', async () => {
    await postRemoveOrganisationAccess(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users`);
  });

  it('then a flash message is shown to the user', async () => {
    await postRemoveOrganisationAccess(req, res);

    expect(res.flash.mock.calls).toHaveLength(1);
    expect(res.flash.mock.calls[0][0]).toBe('info');
  });

});
