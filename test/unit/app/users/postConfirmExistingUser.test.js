const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

describe('when posting the existing user view', () => {

  let req;
  let res;

  let postConfirmExistingUser;

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
        uid: 'userid',
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
        id: 'organisationId',
        name: 'organisationName',
      },
      role: {
        id: 0,
        name: 'category name'
      }
    }];
    res = mockResponse();


    postConfirmExistingUser = require('./../../../../src/app/users/confirmExistingUser').post;
  });

  it('then it should redirect to associate services', async () => {
    await postConfirmExistingUser(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users/${req.session.user.uid}/associate-services`);
  });

  it('then it should redirect to confirm details', async () => {
    req.query.review = 'true';
    await postConfirmExistingUser(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-details`);
  });
});
