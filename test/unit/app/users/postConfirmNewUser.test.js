const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());

jest.mock('./../../../../src/infrastructure/access', () => {
  return {
    addInvitationService: jest.fn(),
    addUserService: jest.fn(),
  };
});

jest.mock('./../../../../src/infrastructure/organisations', () => {
  return {
    putUserInOrganisation: jest.fn(),
    putInvitationInOrganisation: jest.fn(),
    getOrganisationById: jest.fn(),
    getPendingRequestsAssociatedWithUser: jest.fn(),
  };
});

jest.mock('./../../../../src/infrastructure/account', () => ({
  createInvite: jest.fn(),
}));

jest.mock('./../../../../src/infrastructure/search', () => {
  return {
    getById: jest.fn(),
    updateIndex: jest.fn(),
    createIndex: jest.fn(),
  };
});

jest.mock('./../../../../src/app/users/utils');

jest.mock('./../../../../src/infrastructure/logger', () => require('./../../../utils/jestMocks').mockLogger());

const { addInvitationService, addUserService } = require('./../../../../src/infrastructure/access');
const {
  putUserInOrganisation,
  putInvitationInOrganisation,
  getOrganisationById,
  getPendingRequestsAssociatedWithUser,
} = require('./../../../../src/infrastructure/organisations');
const { getById, updateIndex, createIndex } = require('./../../../../src/infrastructure/search');
const Account = require('./../../../../src/infrastructure/account');
const logger = require('./../../../../src/infrastructure/logger');

jest.mock('login.dfe.notifications.client');
const notificationClient = require('login.dfe.notifications.client');

describe('when inviting a new user', () => {
  let req;
  let res;

  let postConfirmNewUser;
  const expectedOrgName = 'organisationName';
  const expectedEmailAddress = 'test@test.com';
  const expectedFirstName = 'test';
  const expectedLastName = 'name';

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      orgId: 'org1',
      uid: 'user1',
    };
    req.session = {
      user: {
        email: 'test@test.com',
        firstName: 'test',
        lastName: 'name',
        services: [
          {
            serviceId: 'service1',
            roles: [],
          },
        ],
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
    getPendingRequestsAssociatedWithUser.mockReset();
    getPendingRequestsAssociatedWithUser.mockReturnValue([
      {
        id: 'requestId',
        org_id: 'organisationId',
        org_name: 'organisationName',
        user_id: 'user2',
        status: {
          id: 0,
          name: 'pending',
        },
        created_date: '2019-08-12',
      },
    ]);
    res = mockResponse();

    Account.createInvite.mockReset();
    Account.createInvite.mockReturnValue('invite1');

    putInvitationInOrganisation.mockReset();
    putUserInOrganisation.mockReset();
    addInvitationService.mockReset();
    addUserService.mockReset();
    createIndex.mockReset();
    getOrganisationById.mockReset().mockReturnValue({
      id: 'org2',
      name: 'organisation two',
      category: {
        id: '001',
        name: 'Establishment',
      },
      urn: '12345',
      uid: null,
      ukprn: null,
      establishmentNumber: '9876',
      status: {
        id: 1,
        name: 'Open',
      },
      closedOn: null,
      address: null,
      telephone: null,
      localAuthority: {
        id: 'la1',
        name: 'local authority 1',
        code: '456',
      },
      statutoryLowAge: null,
      statutoryHighAge: null,
      legacyId: '789654',
      companyRegistrationNumber: null,
    });

    getById.mockReset();
    getById.mockReturnValue({
      organisations: [
        {
          id: 'org1',
          name: 'organisationId',
          categoryId: '004',
          statusId: 1,
          roleId: 0,
        },
      ],
      services: [],
    });
    postConfirmNewUser = require('./../../../../src/app/users/confirmNewUser').post;
    sendUserAddedToOrganisationStub = jest.fn();
    sendServiceAddedStub = jest.fn();
    notificationClient.mockReset().mockImplementation(() => ({
      sendUserAddedToOrganisation: sendUserAddedToOrganisationStub,
      sendServiceAdded: sendServiceAddedStub,
    }));
  });

  it('then it should redirect to users list if no user in session', async () => {
    req.session.user = null;
    await postConfirmNewUser(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users`);
    expect(Account.createInvite.mock.calls).toHaveLength(0);
  });

  it('then it should create an invite if no uid exists in params', async () => {
    req.params.uid = null;
    await postConfirmNewUser(req, res);
    expect(Account.createInvite.mock.calls).toHaveLength(1);
    expect(Account.createInvite.mock.calls[0][0]).toBe('test');
    expect(Account.createInvite.mock.calls[0][1]).toBe('name');
    expect(Account.createInvite.mock.calls[0][2]).toBe('test@test.com');
  });

  it('then it should add invitation to organisation', async () => {
    req.params.uid = 'inv-invite1';
    req.session.user.isInvite = true;
    await postConfirmNewUser(req, res);

    expect(putInvitationInOrganisation.mock.calls).toHaveLength(1);
    expect(putInvitationInOrganisation.mock.calls[0][0]).toBe('invite1');
    expect(putInvitationInOrganisation.mock.calls[0][1]).toBe('org1');
    expect(putInvitationInOrganisation.mock.calls[0][2]).toBe(0);
    expect(putInvitationInOrganisation.mock.calls[0][3]).toBe('correlationId');
  });

  it('then it should add services to invitation for organisation', async () => {
    req.params.uid = 'inv-invite1';
    await postConfirmNewUser(req, res);

    expect(addInvitationService.mock.calls).toHaveLength(1);
    expect(addInvitationService.mock.calls[0][0]).toBe('invite1');
    expect(addInvitationService.mock.calls[0][1]).toBe('service1');
    expect(addInvitationService.mock.calls[0][2]).toBe('org1');
    expect(addInvitationService.mock.calls[0][3]).toEqual([]);
    expect(addInvitationService.mock.calls[0][4]).toBe('correlationId');
  });

  it('then it should add user to organisation if through invite journey', async () => {
    req.params.uid = 'user1';
    req.session.user.isInvite = true;
    await postConfirmNewUser(req, res);

    expect(putUserInOrganisation.mock.calls).toHaveLength(1);
    expect(putUserInOrganisation.mock.calls[0][0]).toBe('user1');
    expect(putUserInOrganisation.mock.calls[0][1]).toBe('org1');
    expect(putUserInOrganisation.mock.calls[0][2]).toBe(0);
    expect(putUserInOrganisation.mock.calls[0][3]).toBe('correlationId');
  });

  it('then it should not attempt to add user to organisation if not through invite journey', async () => {
    req.params.uid = 'user1';
    req.session.user.isInvite = false;
    await postConfirmNewUser(req, res);

    expect(putUserInOrganisation.mock.calls).toHaveLength(0);
  });

  it('then it should add services to user', async () => {
    req.params.uid = 'user1';
    await postConfirmNewUser(req, res);

    expect(addUserService.mock.calls).toHaveLength(1);
    expect(addUserService.mock.calls[0][0]).toBe('user1');
    expect(addUserService.mock.calls[0][1]).toBe('service1');
    expect(addUserService.mock.calls[0][2]).toBe('org1');
    expect(addUserService.mock.calls[0][3]).toEqual([]);
    expect(addUserService.mock.calls[0][4]).toBe('correlationId');
  });

  it('then it should patch the user with the org added if existing user', async () => {
    req.session.user.isInvite = true;

    await postConfirmNewUser(req, res);

    expect(updateIndex.mock.calls).toHaveLength(1);
    expect(updateIndex.mock.calls[0][0]).toBe('user1');
    expect(updateIndex.mock.calls[0][1]).toEqual([
      {
        categoryId: '004',
        id: 'org1',
        name: 'organisationId',
        roleId: 0,
        statusId: 1,
      },
      {
        categoryId: '001',
        id: 'org2',
        name: 'organisation two',
        urn: '12345',
        establishmentNumber: '9876',
        laNumber: '456',
        roleId: 0,
        statusId: 1,
      },
    ]);
  });

  it('then it should should audit an invited user', async () => {
    req.params.uid = 'inv-invite1';
    req.session.user.isInvite = true;
    await postConfirmNewUser(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0]).toBe(
      'user.one@unit.test (id: user1) invited test@test.com to organisationName (id: org1) (id: inv-invite1)',
    );
    expect(logger.audit.mock.calls[0][1]).toMatchObject({
      type: 'approver',
      subType: 'user-invited',
      userId: req.user.sub,
      userEmail: req.user.email,
      invitedUserEmail: req.session.user.email,
      invitedUser: req.params.uid,
      organisationId: req.params.orgId,
    });
  });

  it('then it should redirect to users list', async () => {
    req.params.uid = 'inv-invite1';
    req.session.user.isInvite = true;
    await postConfirmNewUser(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users`);
  });

  it('then a flash message is displayed for a user being added to an org', async () => {
    req.session.user.isInvite = true;
    await postConfirmNewUser(req, res);

    expect(res.flash.mock.calls).toHaveLength(1);
    expect(res.flash.mock.calls[0][0]).toBe('info');
    expect(res.flash.mock.calls[0][1]).toBe(`User test@test.com added to organisation`);
  });

  it('then a flash message is displayed for a user being invited', async () => {
    req.params.uid = null;
    req.session.user.isInvite = true;
    await postConfirmNewUser(req, res);

    expect(res.flash.mock.calls).toHaveLength(1);
    expect(res.flash.mock.calls[0][0]).toBe('info');
    expect(res.flash.mock.calls[0][1]).toBe(`Invitation email sent to test@test.com`);
  });

  it('then it should should audit adding services to an existing user', async () => {
    req.params.uid = 'user1';
    await postConfirmNewUser(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0]).toBe(
      'user.one@unit.test (id: user1) added services for organisation organisationName (id: org1) for user test@test.com (id: user1)',
    );
    expect(logger.audit.mock.calls[0][1]).toMatchObject({
      type: 'approver',
      subType: 'user-services-added',
      userId: req.user.sub,
      userEmail: req.user.email,
      editedUser: req.params.uid,
      editedFields: [
        {
          name: 'add_services',
          newValue: req.session.user.services,
        },
      ],
    });
  });

  it('then it should redirect to users profile if adding services to an existing user', async () => {
    req.params.uid = 'user1';
    req.session.user.uid = 'user1';
    await postConfirmNewUser(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users/${req.params.uid}/services`);
  });

  it('then a flash message is displayed showing services have been added', async () => {
    req.params.uid = 'user1';
    req.session.user.uid = 'user1';
    await postConfirmNewUser(req, res);

    expect(res.flash.mock.calls).toHaveLength(1);
    expect(res.flash.mock.calls[0][0]).toBe('info');
    expect(res.flash.mock.calls[0][1]).toBe(`Services successfully added`);
  });

  it('then it should send an email notification to user when added to organisation', async () => {
    req.params.uid = 'user1';
    req.session.user.uid = 'user1';
    req.session.user.isInvite = true;

    await postConfirmNewUser(req, res);

    expect(sendUserAddedToOrganisationStub.mock.calls).toHaveLength(1);

    expect(sendUserAddedToOrganisationStub.mock.calls[0][0]).toBe(expectedEmailAddress);
    expect(sendUserAddedToOrganisationStub.mock.calls[0][1]).toBe(expectedFirstName);
    expect(sendUserAddedToOrganisationStub.mock.calls[0][2]).toBe(expectedLastName);
    expect(sendUserAddedToOrganisationStub.mock.calls[0][3]).toBe(expectedOrgName);
  });

  it('then it should send an email notification to user when service added', async () => {
    req.params.uid = 'user1';
    req.session.user.uid = 'user1';
    req.session.user.isInvite = true;

    await postConfirmNewUser(req, res);

    expect(sendServiceAddedStub.mock.calls).toHaveLength(1);

    expect(sendServiceAddedStub.mock.calls[0][0]).toBe(expectedEmailAddress);
    expect(sendServiceAddedStub.mock.calls[0][1]).toBe(expectedFirstName);
    expect(sendServiceAddedStub.mock.calls[0][2]).toBe(expectedLastName);
  });
});
