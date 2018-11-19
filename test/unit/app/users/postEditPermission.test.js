const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/logger', () => require('./../../../utils/jestMocks').mockLogger());

jest.mock('./../../../../src/infrastructure/organisations', () => {
  return {
    putUserInOrganisation: jest.fn(),
    putInvitationInOrganisation: jest.fn(),
  };
});

jest.mock('./../../../../src/app/users/utils');

const logger = require('./../../../../src/infrastructure/logger');
const { getUserDetails } = require('./../../../../src/app/users/utils');
const { putUserInOrganisation, putInvitationInOrganisation } = require('./../../../../src/infrastructure/organisations');

describe('when editing organisation permission level', () => {

  let req;
  let res;

  let postEditPermission;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
      sid: 'service1'
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
    postEditPermission = require('./../../../../src/app/users/editPermission').post;
  });

  it('then it should edit organisation permission level for invitation', async () => {
    req.params.uid = 'inv-invite1';

    await postEditPermission(req, res);

    expect(putInvitationInOrganisation.mock.calls).toHaveLength(1);
    expect(putInvitationInOrganisation.mock.calls[0][0]).toBe('invite1');
    expect(putInvitationInOrganisation.mock.calls[0][1]).toBe('org1');
  });

  it('then it should edit organisation permission level for user', async () => {

    await postEditPermission(req, res);

    expect(putUserInOrganisation.mock.calls).toHaveLength(1);
    expect(putUserInOrganisation.mock.calls[0][0]).toBe('user1');
    expect(putUserInOrganisation.mock.calls[0][1]).toBe('org1');
  });

  it('then it should should audit permission level being edited', async () => {
    await postEditPermission(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0]).toBe('user.one@unit.test (id: user1) edited permission level to end user for org organisationName (id: org1) for user email@email.com (id: user1)');
    expect(logger.audit.mock.calls[0][1]).toMatchObject({
      type: 'approver',
      subType: 'user-org-permission-edited',
      userId: 'user1',
      userEmail: 'user.one@unit.test',
      editedUser: 'user1',
      editedFields: [
        {
          name: 'edited_permission',
          newValue: 'end user',
        }
      ],
    });
  });

  it('then it should redirect to user details', async () => {
    await postEditPermission(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users/${req.params.uid}/services`);
  });

  it('then a flash message is shown to the user', async () => {
    await postEditPermission(req, res);

    expect(res.flash.mock.calls).toHaveLength(1);
    expect(res.flash.mock.calls[0][0]).toBe('info');
  });


});
