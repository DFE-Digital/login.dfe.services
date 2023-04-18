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
  getByEmail: jest.fn(),
  getById: jest.fn(),
  getInvitationByEmail: jest.fn(),
}));

const { actions } = require('../../../../src/app/constans/actions');

const {
  getOrganisationAndServiceForUser,
  getOrganisationAndServiceForInvitation,
} = require('./../../../../src/infrastructure/organisations');
const Account = require('./../../../../src/infrastructure/account');
const config = require('../../../../src/infrastructure/config');

describe('when entering a new users details', () => {
  let req;
  let res;

  let postNewUserDetails;

  let backRedirect;

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
    req.body = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'johndoe@someschool.com',
    };
    res = mockResponse();

    Account.getByEmail.mockReset().mockReturnValue(null);
    Account.getById.mockReset().mockReturnValue(null);
    Account.getInvitationByEmail.mockReset().mockReturnValue(null);
    getOrganisationAndServiceForInvitation.mockReset().mockReturnValue(null);
    getOrganisationAndServiceForUser.mockReset().mockReturnValue(null);

    postNewUserDetails = require('./../../../../src/app/users/newUserDetails').post;

    backRedirect = `/approvals/select-organisation?action=${actions.ORG_INVITE}`
  });

  it('then it should include user details in session', async () => {
    await postNewUserDetails(req, res);

    expect(req.session.user).not.toBeNull();
    expect(req.session.user.firstName).toBe('John');
    expect(req.session.user.lastName).toBe('Doe');
    expect(req.session.user.email).toBe('johndoe@someschool.com');
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
      email: 'johndoe@someschool.com',
      backLink: backRedirect,
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
      email: 'johndoe@someschool.com',
      backLink: backRedirect,
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
      backLink: backRedirect,
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
      backLink: backRedirect,
      currentPage: 'users',
      isDSIUser: false,
      organisationId: 'org1',
      uid: '',
      validationMessages: {
        email: 'Please enter a valid email address',
      },
    });
  });

  it('then it should render view if email is a blacklisted email and environment is Production', async () => {
    req.body.email = 'blacklisted.domain@hotmail.com';
    config.toggles.environmentName = 'pr';
    await postNewUserDetails(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/newUserDetails');
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: 'token',
      firstName: 'John',
      lastName: 'Doe',
      email: 'blacklisted.domain@hotmail.com',
      backLink: backRedirect,
      currentPage: 'users',
      isDSIUser: false,
      organisationId: 'org1',
      uid: '',
      validationMessages: {
        email: 'This email address is not valid for this service.\r\n Generic email names (e.g. headmaster@, admin@) and domains (e.g. @yahoo.co.uk, @gmail.co.uk) compromise security.\r\n Enter an email address that is associated with your organisation.',
      },
    });
  });

  it('then it should render view if email is a blacklisted email and environment is other than Production', async () => {
    req.body.email = 'blacklisted.domain@hotmail.com';
    config.toggles.environmentName = 'dev';

    await postNewUserDetails(req, res);

    expect(res.render.mock.calls).toHaveLength(0);
  });

  it('then it should render view if email already associated to a user in this org', async () => {
    Account.getById.mockReturnValue({
      claims: {
        sub: 'user1',
      },
    });
    Account.getByEmail.mockReturnValue({
      claims: {
        sub: 'user1',
      },
    });
    getOrganisationAndServiceForUser.mockReturnValue([
      {
        organisation: {
          id: 'org1',
          name: 'organisation1',
        },
      },
    ]);

    await postNewUserDetails(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/newUserDetails');
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: 'token',
      firstName: 'John',
      lastName: 'Doe',
      email: 'johndoe@someschool.com',
      backLink: backRedirect,
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
    getOrganisationAndServiceForInvitation.mockReturnValue([
      {
        organisation: {
          id: 'org1',
          name: 'organisation1',
        },
      },
    ]);

    await postNewUserDetails(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('users/views/newUserDetails');
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: 'token',
      firstName: 'John',
      lastName: 'Doe',
      email: 'johndoe@someschool.com',
      backLink: backRedirect,
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
      },
    });
    Account.getByEmail.mockReturnValue({
      claims: {
        sub: 'user1',
      },
    });
    getOrganisationAndServiceForUser.mockReturnValue([
      {
        organisation: {
          id: 'org2',
          name: 'organisation2',
        },
      },
    ]);

    await postNewUserDetails(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(
      `/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-user`,
    );
  });

  it('then it should redirect to confirm user if inv not in org', async () => {
    Account.getInvitationByEmail.mockReturnValue({
      id: 'inv1',
    });
    getOrganisationAndServiceForInvitation.mockReturnValue([
      {
        organisation: {
          id: 'org2',
          name: 'organisation2',
        },
      },
    ]);

    await postNewUserDetails(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(
      `/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-user`,
    );
  });

  it('then it should redirect to confirm user if user not in org and include review in query string', async () => {
    req.query.review = 'true';
    Account.getById.mockReturnValue({
      claims: {
        sub: 'user1',
      },
    });
    Account.getByEmail.mockReturnValue({
      claims: {
        sub: 'user1',
      },
    });
    getOrganisationAndServiceForUser.mockReturnValue([
      {
        organisation: {
          id: 'org2',
          name: 'organisation2',
        },
      },
    ]);

    await postNewUserDetails(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(
      `/approvals/${req.params.orgId}/users/${req.session.user.uid}/confirm-user?review=true`,
    );
  });
});
