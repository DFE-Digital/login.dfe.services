const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/logger', () => require('./../../../utils/jestMocks').mockLogger());
jest.mock('./../../../../src/infrastructure/access', () => {
  return {
    updateUserService: jest.fn(),
    updateInvitationService: jest.fn(),
    listRolesOfService: jest.fn(),
  };
});

jest.mock('./../../../../src/app/users/utils');
jest.mock('login.dfe.notifications.client');
const notificationClient = require('login.dfe.notifications.client');
const logger = require('./../../../../src/infrastructure/logger');
const { getSingleServiceForUser } = require('./../../../../src/app/users/utils');
const {
  updateUserService,
  updateInvitationService,
  listRolesOfService,
} = require('./../../../../src/infrastructure/access');

describe('when editing a service for a user', () => {
  let req;
  let res;

  let postConfirmEditService;
  const expectedEmailAddress = 'test@test.com';
  const expectedFirstName = 'test';
  const expectedLastName = 'name';

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
      sid: 'service1',
    };

    req.session = {
      user: {
        email: 'test@test.com',
        firstName: 'test',
        lastName: 'name',
      },
      service: {
        roles: ['role1', 'role2'],
      },
    };

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
          id: 'org1',
          name: 'organisationName',
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

    getSingleServiceForUser.mockReset();
    getSingleServiceForUser.mockReturnValue({
      id: 'service1',
      dateActivated: '10/10/2018',
      name: 'service name',
      status: 'active',
    });

    listRolesOfService.mockReset();
    listRolesOfService.mockReturnValue([
      {
        code: 'role_code',
        id: 'role_id',
        name: 'role_name',
        status: {
          id: 'status_id',
        },
      },
    ]);

    res = mockResponse();
    postConfirmEditService = require('./../../../../src/app/users/confirmEditService').post;
    sendServiceAddedStub = jest.fn();
    notificationClient.mockReset().mockImplementation(() => ({
      sendServiceAdded: sendServiceAddedStub,
    }));
  });

  it('then it should edit service for invitation if request for invitation', async () => {
    req.params.uid = 'inv-invite1';

    await postConfirmEditService(req, res);

    expect(updateInvitationService.mock.calls).toHaveLength(1);
    expect(updateInvitationService.mock.calls[0][0]).toBe('invite1');
    expect(updateInvitationService.mock.calls[0][1]).toBe('service1');
    expect(updateInvitationService.mock.calls[0][2]).toBe('org1');
    expect(updateInvitationService.mock.calls[0][3]).toEqual(['role1', 'role2']);
    expect(updateInvitationService.mock.calls[0][4]).toBe('correlationId');
  });

  it('then it should edit service for user if request for user', async () => {
    await postConfirmEditService(req, res);

    expect(updateUserService.mock.calls).toHaveLength(1);
    expect(updateUserService.mock.calls[0][0]).toBe('user1');
    expect(updateUserService.mock.calls[0][1]).toBe('service1');
    expect(updateUserService.mock.calls[0][2]).toBe('org1');
    expect(updateUserService.mock.calls[0][3]).toEqual(['role1', 'role2']);
    expect(updateUserService.mock.calls[0][4]).toBe('correlationId');
  });

  it('then it should should audit service being edited', async () => {
    await postConfirmEditService(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      'user.one@unit.test (id: user1) updated service service name for organisation organisationName (id: org1) for user test@test.com (id: user1)',
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      type: 'approver',
      subType: 'user-service-updated',
      userId: 'user1',
      userEmail: 'user.one@unit.test',
      editedUser: 'user1',
      editedFields: [
        {
          name: 'update_service',
          newValue: ['role1', 'role2'],
        },
      ],
    });
  });

  it('then it should redirect to user details', async () => {
    await postConfirmEditService(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users/${req.params.uid}/services`);
  });

  it('then a flash message is shown to the user', async () => {
    await postConfirmEditService(req, res);

    expect(res.flash.mock.calls).toHaveLength(1);
    expect(res.flash.mock.calls[0][0]).toBe('info');
    expect(res.flash.mock.calls[0][1]).toBe(`service name updated successfully`);
  });

  it('then it should send an email notification to user when service added', async () => {
    await postConfirmEditService(req, res);

    expect(sendServiceAddedStub.mock.calls).toHaveLength(1);

    expect(sendServiceAddedStub.mock.calls[0][0]).toBe(expectedEmailAddress);
    expect(sendServiceAddedStub.mock.calls[0][1]).toBe(expectedFirstName);
    expect(sendServiceAddedStub.mock.calls[0][2]).toBe(expectedLastName);
  });
});
