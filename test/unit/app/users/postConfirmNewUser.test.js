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
  };
});

jest.mock('./../../../../src/infrastructure/account', () => ({
  createInvite: jest.fn(),
}));

jest.mock('./../../../../src/infrastructure/logger', () => require('./../../../utils/jestMocks').mockLogger());

const { addInvitationService, addUserService } = require('./../../../../src/infrastructure/access');
const { putUserInOrganisation, putInvitationInOrganisation } = require('./../../../../src/infrastructure/organisations');
const Account = require('./../../../../src/infrastructure/account');
const logger = require('./../../../../src/infrastructure/logger');

describe('when inviting a new user', () => {

  let req;
  let res;

  let postConfirmNewUser;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      orgId: 'org1',
      uid: 'user1'
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
          }
        ],
      },
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
    res = mockResponse();

    Account.createInvite.mockReset();
    Account.createInvite.mockReturnValue('invite1');

    putInvitationInOrganisation.mockReset();
    putUserInOrganisation.mockReset();
    addInvitationService.mockReset();
    addUserService.mockReset();


    postConfirmNewUser = require('./../../../../src/app/users/confirmNewUser').post;
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

  it('then it should should audit an invited user', async () => {
    req.params.uid = 'inv-invite1';
    req.session.user.isInvite = true;
    await postConfirmNewUser(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0]).toBe('user.one@unit.test (id: user1) invited test@test.com to organisationName (id: org1) (id: inv-invite1)');
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
    expect(res.flash.mock.calls[0][1]).toBe(`User test@test.com added to organisation`)
  });

  it('then a flash message is displayed for a user being invited', async () => {
    req.params.uid = null;
    req.session.user.isInvite = true;
    await postConfirmNewUser(req, res);

    expect(res.flash.mock.calls).toHaveLength(1);
    expect(res.flash.mock.calls[0][0]).toBe('info');
    expect(res.flash.mock.calls[0][1]).toBe(`Invitation email sent to test@test.com`)
  });


  it('then it should should audit adding services to an existing user', async () => {
    req.params.uid = 'user1';
    await postConfirmNewUser(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0]).toBe('user.one@unit.test (id: user1) added services for organisation organisationName (id: org1) for user test@test.com (id: user1)');
    expect(logger.audit.mock.calls[0][1]).toMatchObject({
      type: 'approver',
      subType: 'user-services-added',
      userId: req.user.sub,
      userEmail: req.user.email,
      editedUser: req.params.uid,
      editedFields: [{
        name: 'add_services',
        newValue: req.session.user.services,
      }],
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
    expect(res.flash.mock.calls[0][1]).toBe(`Services successfully added`)
  });

});
