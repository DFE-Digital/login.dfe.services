const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');

jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/logger', () => require('./../../../utils/jestMocks').mockLogger());
jest.mock('./../../../../src/infrastructure/organisations', () => {
  return {
    getOrganisationAndServiceForUser: jest.fn(),
    getOrganisationAndServiceForInvitation: jest.fn(),
  };
});
jest.mock('./../../../../src/infrastructure/account', () => ({
  getById: jest.fn(),
  getInvitationByEmail: jest.fn(),
}));

const { getOrganisationAndServiceForUser, getOrganisationAndServiceForInvitation} = require('./../../../../src/infrastructure/organisations');
const Account = require('./../../../../src/infrastructure/account');

describe('when entering a new users details', () => {

  let req;
  let res;

  let postNewUserDetails;

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
      sid: 'service1',
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
    req.body = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'johndoe@gmail.com',
    };
    res = mockResponse();

    Account.getById.mockReset().mockReturnValue(null);
    Account.getInvitationByEmail.mockReset().mockReturnValue(null);
    getOrganisationAndServiceForInvitation.mockReset().mockReturnValue(null);
    getOrganisationAndServiceForUser.mockReset().mockReturnValue(null);

    postNewUserDetails = require('./../../../../src/app/users/newUserDetails').post;
  });

  it('then it should include user details in session', async () => {
    await postNewUserDetails(req, res);

    expect(req.session.user).not.toBeNull();
    expect(req.session.user.firstName).toBe('John');
    expect(req.session.user.lastName).toBe('Doe');
    expect(req.session.user.email).toBe('johndoe@gmail.com');
  });

  it('then it should render view if first name not entered', async () => {
    req.body.firstName = undefined;

    await postNewUserDetails(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/newUserDetails');
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: 'token',
      firstName: '',
      lastName: 'Doe',
      email: 'johndoe@gmail.com',
      backLink: './',
      currentPage: 'users',
      isDSIUser: false,
      organisationId: 'org1',
      uid: '',
      validationMessages: {
        firstName: 'Please enter a first name',
      },
    });
  });

  it('then it should render view if last name not entered', async () => {
    req.body.lastName = undefined;

    await postNewUserDetails(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/newUserDetails');
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: 'token',
      firstName: 'John',
      lastName: '',
      email: 'johndoe@gmail.com',
      backLink: './',
      currentPage: 'users',
      isDSIUser: false,
      organisationId: 'org1',
      uid: '',
      validationMessages: {
        lastName: 'Please enter a last name',
      },
    });
  });

  it('then it should render view if email not entered', async () => {
    req.body.email = undefined;

    await postNewUserDetails(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/newUserDetails');
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: 'token',
      firstName: 'John',
      lastName: 'Doe',
      email: '',
      backLink: './',
      currentPage: 'users',
      isDSIUser: false,
      organisationId: 'org1',
      uid: '',
      validationMessages: {
        email: 'Please enter an email address',
      },
    });
  });

  it('then it should render view if email not a valid email address', async () => {
    req.body.email = 'not-an-email';

    await postNewUserDetails(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/newUserDetails');
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: 'token',
      firstName: 'John',
      lastName: 'Doe',
      email: 'not-an-email',
      backLink: './',
      currentPage: 'users',
      isDSIUser: false,
      organisationId: 'org1',
      uid: '',
      validationMessages: {
        email: 'Please enter a valid email address',
      },
    });
  });

  it('then it should render view if email already associated to a user in this org', async () => {
    Account.getById.mockReturnValue({
      claims: {
        sub: 'user1',
      }
    });
    getOrganisationAndServiceForUser.mockReturnValue([{
      organisation: {
        id: 'org1',
        name: 'organisation1'
      }
    }]);

    await postNewUserDetails(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/newUserDetails');
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: 'token',
      firstName: 'John',
      lastName: 'Doe',
      email: 'johndoe@gmail.com',
      backLink: './',
      currentPage: 'users',
      isDSIUser: false,
      organisationId: 'org1',
      uid: '',
      validationMessages: {
        email: 'A DfE Sign-in user already exists with that email address for organisation1',
      },
    });
  });

  it('then it should render view if email already associated to a invitation in this org', async () => {
    Account.getInvitationByEmail.mockReturnValue({
      id: 'inv1',

    });
    getOrganisationAndServiceForInvitation.mockReturnValue([{
      organisation: {
        id: 'org1',
        name: 'organisation1'
      }
    }]);

    await postNewUserDetails(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/newUserDetails');
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: 'token',
      firstName: 'John',
      lastName: 'Doe',
      email: 'johndoe@gmail.com',
      backLink: './',
      currentPage: 'users',
      isDSIUser: false,
      organisationId: 'org1',
      uid: '',
      validationMessages: {
        email: 'A DfE Sign-in user already exists with that email address for organisation1',
      },
    });
  });

  it('then it should redirect to confirm user if user not in org', async () => {
    Account.getById.mockReturnValue({
      claims: {
        sub: 'user1',
      }
    });
    getOrganisationAndServiceForUser.mockReturnValue([{
      organisation: {
        id: 'org2',
        name: 'organisation2'
      }
    }]);

    await postNewUserDetails(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-user`);
  });

  it('then it should redirect to confirm user if inv not in org', async () => {
    Account.getInvitationByEmail.mockReturnValue({
      id: 'inv1',

    });
    getOrganisationAndServiceForInvitation.mockReturnValue([{
      organisation: {
        id: 'org2',
        name: 'organisation2'
      }
    }]);

    await postNewUserDetails(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-user`);
  });

  it('then it should redirect to confirm user if user not in org and include review in query string', async () => {

    req.query.review = 'true';
    Account.getById.mockReturnValue({
      claims: {
        sub: 'user1',
      }
    });
    getOrganisationAndServiceForUser.mockReturnValue([{
      organisation: {
        id: 'org2',
        name: 'organisation2'
      }
    }]);

    await postNewUserDetails(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-user?review=true`);
  });

});
