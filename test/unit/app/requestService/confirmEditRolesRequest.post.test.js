const { mockRequest, mockResponse } = require('../../../utils/jestMocks');
const { getSingleServiceForUser } = require('../../../../src/app/users/utils');
const { listRolesOfService } = require('../../../../src/infrastructure/access');
const { createServiceRequest } = require('../../../../src/app/requestService/utils');
const { v4: uuid } = require('uuid');
const notificationClient = require('login.dfe.notifications.client');
const logger = require('../../../../src/infrastructure/logger');

jest.mock('uuid');
jest.mock('login.dfe.dao', () => require('../../../utils/jestMocks').mockDao());
jest.mock('../../../../src/infrastructure/config', () => require('../../../utils/jestMocks').mockConfig());
jest.mock('../../../../src/infrastructure/logger', () => require('../../../utils/jestMocks').mockLogger());
jest.mock('../../../../src/infrastructure/access', () => {
  return { listRolesOfService: jest.fn() };
});

jest.mock('../../../../src/app/requestService/utils', () => {
  return {
    createServiceRequest: jest.fn(),
  };
});

jest.mock('../../../../src/app/users/utils');
jest.mock('login.dfe.notifications.client');

describe('When confirming and submiting a sub-service request', () => {
  let req;
  let res;

  let postConfirmEditRolesRequest;

  const baseUrl = 'https://localhost:3000';
  const helpUrl = 'https://localhost:3001/help/requests/can-end-user-request-service';
  const rejectUrl = `${baseUrl}/request-service/org1/users/user1/services/service1/roles/${encodeURIComponent(
    JSON.stringify(['role1']),
  )}/new-uuid/reject-roles-request`;
  let approveUrl = `${baseUrl}/request-service/org1/users/user1/services/service1/roles/${encodeURIComponent(
    JSON.stringify(['role1']),
  )}/new-uuid/approve-roles-request`;
  const loggerAuditMessage =
    'user.one@unit.test (userId: user1) requested service roles update for (serviceId: service1) and roles (roleIds: ["role1"]) for organisation (orgId: org1) - requestId (reqId: new-uuid)';

  beforeEach(() => {
    req = mockRequest();
    req.params = {
      uid: 'user1',
      orgId: 'org1',
      sid: 'service1',
      reqID: 'reqID-1212',
    };

    req.session = {
      user: {
        email: 'test@test.com',
        firstName: 'test',
        lastName: 'name',
      },
      service: {
        roles: ['role1'],
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
        id: 'role1',
        name: 'role_name',
        status: {
          id: 'status_id',
        },
      },
    ]);

    res = mockResponse();
    postConfirmEditRolesRequest = require('../../../../src/app/requestService/confirmEditRolesRequest').post;
    sendSubServiceRequestToApproversStub = jest.fn();
    notificationClient.mockReset().mockImplementation(() => ({
      sendSubServiceRequestToApprovers: sendSubServiceRequestToApproversStub,
    }));

    uuid.mockImplementation(() => {
      return 'new-uuid';
    });
  });

  it('then it should get the selected service details', async () => {
    await postConfirmEditRolesRequest(req, res);

    expect(getSingleServiceForUser.mock.calls).toHaveLength(1);
    expect(getSingleServiceForUser.mock.calls[0][0]).toBe('user1');
    expect(getSingleServiceForUser.mock.calls[0][1]).toBe('org1');
    expect(getSingleServiceForUser.mock.calls[0][2]).toBe('service1');
    expect(getSingleServiceForUser.mock.calls[0][3]).toBe('correlationId');
  });

  it('then it should get the requested roles', async () => {
    await postConfirmEditRolesRequest(req, res);

    expect(listRolesOfService.mock.calls).toHaveLength(1);
    expect(listRolesOfService.mock.calls[0][0]).toBe('service1');
    expect(listRolesOfService.mock.calls[0][1]).toBe('correlationId');
  });

  it('then it should create a Service request of type subService ', async () => {
    await postConfirmEditRolesRequest(req, res);

    expect(createServiceRequest.mock.calls).toHaveLength(1);
    expect(createServiceRequest.mock.calls[0][0]).toBe('new-uuid');
    expect(createServiceRequest.mock.calls[0][1]).toBe('user1');
    expect(createServiceRequest.mock.calls[0][2]).toBe('service1');
    expect(createServiceRequest.mock.calls[0][3]).toStrictEqual(['role1']);
    expect(createServiceRequest.mock.calls[0][4]).toBe('org1');
    expect(createServiceRequest.mock.calls[0][5]).toBe(0);
    expect(createServiceRequest.mock.calls[0][6]).toBe('subService');
  });

  it('then it should send an email notification to all Approvers at the organisation with the request', async () => {
    await postConfirmEditRolesRequest(req, res);

    expect(sendSubServiceRequestToApproversStub.mock.calls).toHaveLength(1);

    expect(sendSubServiceRequestToApproversStub.mock.calls[0][0]).toBe('test');
    expect(sendSubServiceRequestToApproversStub.mock.calls[0][1]).toBe('name');
    expect(sendSubServiceRequestToApproversStub.mock.calls[0][2]).toBe('user.one@unit.test');
    expect(sendSubServiceRequestToApproversStub.mock.calls[0][3]).toBe('org1');
    expect(sendSubServiceRequestToApproversStub.mock.calls[0][4]).toBe('organisationName');
    expect(sendSubServiceRequestToApproversStub.mock.calls[0][5]).toBe('service name');
    expect(sendSubServiceRequestToApproversStub.mock.calls[0][6]).toStrictEqual(['role_name']);
    expect(sendSubServiceRequestToApproversStub.mock.calls[0][7]).toBe(rejectUrl);
    expect(sendSubServiceRequestToApproversStub.mock.calls[0][8]).toBe(approveUrl);
    expect(sendSubServiceRequestToApproversStub.mock.calls[0][9]).toBe(helpUrl);
  });

  it('then it should audit log that sub-service request has been submitted', async () => {
    await postConfirmEditRolesRequest(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(loggerAuditMessage);
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      type: 'sub-service',
      subType: 'sub-service request',
      userId: 'user1',
      userEmail: 'user.one@unit.test',
      env: 'test-run',
    });
  });

  it('then a confirmation flash message is shown to the end user', async () => {
    await postConfirmEditRolesRequest(req, res);

    expect(res.flash.mock.calls).toHaveLength(3);
    expect(res.flash.mock.calls[0][0]).toBe('title');
    expect(res.flash.mock.calls[0][1]).toBe('Success');
    expect(res.flash.mock.calls[1][0]).toBe('heading');
    expect(res.flash.mock.calls[1][1]).toBe('Sub-service changes requested');
    expect(res.flash.mock.calls[2][0]).toBe('message');
    expect(res.flash.mock.calls[2][1]).toBe(
      'Your request to change sub-service access has been sent to all approvers at organisationName.<br>Your request will be approved or rejected within 5 days.',
    );
  });

  it('then it should redirect the end user to `Services` dashboard', async () => {
    await postConfirmEditRolesRequest(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe('/my-services');
  });
});
