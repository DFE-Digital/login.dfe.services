jest.mock('./../../../../src/infrastructure/config', () => require('./../../../utils/jestMocks').mockConfig());
jest.mock('./../../../../src/infrastructure/logger', () => require('./../../../utils/jestMocks').mockLogger());

jest.mock('./../../../../src/infrastructure/organisations');
jest.mock('login.dfe.notifications.client');

const { mockRequest, mockResponse } = require('./../../../utils/jestMocks');
const { post } = require('./../../../../src/app/requestOrganisation/review');
const res = mockResponse();
const { createUserOrganisationRequest, getOrganisationById } = require('./../../../../src/infrastructure/organisations');
const logger = require('./../../../../src/infrastructure/logger');

const NotificationClient = require('login.dfe.notifications.client');
const sendUserOrganisationRequest = jest.fn();
NotificationClient.mockImplementation(() => {
  return {
    sendUserOrganisationRequest
  };
});
const createString = (length) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
  let str = '';
  for (let i = 0; i < length; i += 1) {
    str = str + charset[Math.random() * charset.length];
  }
  return str;
};

describe('when reviewing an organisation request', () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      user: {
        sub: 'user1',
        email: 'email@email.com'
      },
      session: {
        organisationId: 'org1'
      },
      body: {
        organisationId: 'org1',
        organisationName: 'org name',
        reason: 'reason',
      },
    });
    createUserOrganisationRequest.mockReset().mockReturnValue('requestId');

    sendUserOrganisationRequest.mockReset();
    NotificationClient.mockImplementation(() => {
      return {
        sendUserOrganisationRequest,
      };
    });
    getOrganisationById.mockReset().mockReturnValue({
      id: 'org1',
      name: 'organisation two',
      category: {
        'id': '001',
        'name': 'Establishment'
      },
    });
    res.mockResetAll();
  });

  it('then it should render error view if reason is too long', async () => {
    req.body.reason = createString(1001);

    await post(req, res);

    expect(sendUserOrganisationRequest.mock.calls).toHaveLength(0);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe('requestOrganisation/views/review');
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: 'token',
      currentPage: 'organisations',
      organisation: {
        id: 'org1',
        name: 'organisation two',
        category: {
          'id': '001',
          'name': 'Establishment'
        },
      },
        reason: req.body.reason,
        title: 'Confirm Request - DfE Sign-in',
        validationMessages: {
          'reason': 'Reason cannot be longer than 1000 characters'
        }
    });
  });
  it('then it should create the organisation request', async () => {
    await post(req, res);

    expect(createUserOrganisationRequest.mock.calls).toHaveLength(1);
    expect(createUserOrganisationRequest.mock.calls[0][0]).toBe('user1');
    expect(createUserOrganisationRequest.mock.calls[0][1]).toBe('org1');
    expect(createUserOrganisationRequest.mock.calls[0][2]).toBe('reason');
    expect(createUserOrganisationRequest.mock.calls[0][3]).toBe('correlationId');
  });

  it('then it should should audit org request', async () => {
    await post(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0]).toBe('email@email.com (id: user1) requested organisation (id: org1)');
    expect(logger.audit.mock.calls[0][1]).toMatchObject({
      type: 'organisation',
      subType: 'access-request',
      organisationId: 'org1',
      userEmail: 'email@email.com',
      userId: 'user1'
    });
  });

  it('then it should redirect to organisations', async () => {
    await post(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(`/organisations`);
  });

});
