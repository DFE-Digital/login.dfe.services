const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/logger', () => require('./../../../utils/jestMocks').mockLogger());
jest.mock('./../../../../src/infrastructure/organisations', () => {
  return {
    deleteInvitationOrganisation: jest.fn(),
    deleteUserOrganisation: jest.fn(),
  };
});

jest.mock('./../../../../src/infrastructure/access', () => {
  return {
    removeServiceFromUser: jest.fn(),
    removeServiceFromInvitation: jest.fn(),
  };
});

jest.mock('./../../../../src/infrastructure/search', () => {
  return {
    getById: jest.fn(),
    updateIndex: jest.fn(),
  };
});
jest.mock('./../../../../src/app/users/utils');
jest.mock('login.dfe.notifications.client');
const notificationClient = require('login.dfe.notifications.client');

const logger = require('./../../../../src/infrastructure/logger');
const { getAllServicesForUserInOrg } = require('./../../../../src/app/users/utils');
const {
  deleteInvitationOrganisation,
  deleteUserOrganisation,
} = require('./../../../../src/infrastructure/organisations');
const { getById, updateIndex } = require('./../../../../src/infrastructure/search');

describe('when removing organisation access', () => {
  let req;
  let res;

  let postRemoveOrganisationAccess;
  const organisationName = 'organisationName';
  const expectedEmailAddress = 'test@test.com';
  const expectedFirstName = 'test';
  const expectedLastName = 'name';

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
    };
    req.session = {
      user: {
        email: expectedEmailAddress,
        firstName: expectedFirstName,
        lastName: expectedLastName,
      },
    };
    req.user = {
      sub: 'user1',
      email: 'user.one@unit.test',
      organisations: [
        {
          organisation: {
            id: 'organisationId',
            name: organisationName,
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
          id: 'org1',
          name: organisationName,
        },
        role: {
          id: 0,
          name: 'category name',
        },
      },
    ];
    req.body = {
      selectedOrganisation: 'organisationId',
    };
    getAllServicesForUserInOrg.mockReset();
    getAllServicesForUserInOrg.mockReturnValue({
      id: 'service1',
      dateActivated: '10/10/2018',
      name: 'service name',
      status: 'active',
    });

    getById.mockReset();
    getById.mockReturnValue({
      organisations: [
        {
          id: 'org1',
          name: 'organisationName',
          categoryId: '004',
          statusId: 1,
          roleId: 0,
        },
      ],
    });

    res = mockResponse();
    postRemoveOrganisationAccess = require('./../../../../src/app/users/removeOrganisationAccess').post;
    sendUserRemovedFromOrganisationStub = jest.fn();
    notificationClient.mockReset().mockImplementation(() => ({
      sendUserRemovedFromOrganisation: sendUserRemovedFromOrganisationStub,
    }));
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

  it('then it should patch the user with the org removed', async () => {
    await postRemoveOrganisationAccess(req, res);

    expect(updateIndex.mock.calls).toHaveLength(1);
    expect(updateIndex.mock.calls[0][0]).toBe('user1');
    expect(updateIndex.mock.calls[0][1]).toEqual([]);
  });

  it('then it should should audit user being removed from org', async () => {
    await postRemoveOrganisationAccess(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      'user.one@unit.test (id: user1) removed organisation organisationName (id: org1) for user test@test.com (id: user1)',
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      type: 'approver',
      subType: 'user-org-deleted',
      userId: 'user1',
      userEmail: 'user.one@unit.test',
      meta: {
        editedUser: 'user1',
        editedFields: [
          {
            name: 'new_organisation',
            oldValue: 'org1',
            newValue: undefined,
          },
        ],
      },
    });
  });

  it('then it should redirect to users list', async () => {
    await postRemoveOrganisationAccess(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users`);
  });

  it('then a flash message is shown to the user', async () => {
    await postRemoveOrganisationAccess(req, res);

    expect(res.flash.mock.calls).toHaveLength(1);
    expect(res.flash.mock.calls[0][0]).toBe('info');
    expect(res.flash.mock.calls[0][1]).toBe(`${expectedEmailAddress} removed from organisation`);
  });

  it('then it should send an email notification to user', async () => {
    await postRemoveOrganisationAccess(req, res);

    expect(sendUserRemovedFromOrganisationStub.mock.calls).toHaveLength(1);

    expect(sendUserRemovedFromOrganisationStub.mock.calls[0][0]).toBe(expectedEmailAddress);
    expect(sendUserRemovedFromOrganisationStub.mock.calls[0][1]).toBe(expectedFirstName);
    expect(sendUserRemovedFromOrganisationStub.mock.calls[0][2]).toBe(expectedLastName);
    expect(sendUserRemovedFromOrganisationStub.mock.calls[0][3]).toBe(organisationName);
  });
});
