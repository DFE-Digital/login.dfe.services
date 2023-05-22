const { mockRequest, mockResponse, mockAdapterConfig } = require('../../../utils/jestMocks');
const { checkCacheForAllServices } = require('../../../../src/infrastructure/helpers/allServicesAppCache');
const { getUserDetails } = require('../../../../src/app/users/utils');
const { listRolesOfService, updateUserService } = require('../../../../src/infrastructure/access');
const { isServiceEmailNotificationAllowed } = require('../../../../src/infrastructure/applications');
const { getUserServiceRequestStatus, updateServiceRequest } = require('../../../../src/app/requestService/utils');
const PolicyEngine = require('login.dfe.policy-engine');
const notificationClient = require('login.dfe.notifications.client');
const logger = require('./../../../../src/infrastructure/logger');

jest.mock('login.dfe.policy-engine');
jest.mock('login.dfe.notifications.client');
jest.mock('../../../../src/app/users/utils');
jest.mock('../../../../src/infrastructure/logger', () => require('./../../../utils/jestMocks').mockLogger());
jest.mock('../../../../src/infrastructure/access', () => {
  return {
    updateUserService: jest.fn(),
    listRolesOfService: jest.fn(),
  };
});
jest.mock('../../../../src/infrastructure/applications', () => {
  return { isServiceEmailNotificationAllowed: jest.fn() };
});
jest.mock('../../../../src/app/requestService/utils', () => {
  return {
    getUserServiceRequestStatus: jest.fn(),
    updateServiceRequest: jest.fn(),
  };
});
jest.mock('../../../../src/infrastructure/helpers/allServicesAppCache', () => {
  return {
    checkCacheForAllServices: jest.fn(),
  };
});
jest.mock('../../../../src/infrastructure/config', () => {
  return mockAdapterConfig();
});
jest.mock('login.dfe.dao', () => {
  return {
    services: {
      getUserServiceRequest: jest.fn(),
    },
  };
});

const policyEngine = {
  getPolicyApplicationResultsForUser: jest.fn(),
  validate: jest.fn(),
};

describe('When approving a sub service request', () => {
  let req;
  let res;

  let postRejectRolesRequest;

  beforeEach(() => {
    req = mockRequest();

    (req.params = {
      orgId: 'organisationId',
      uid: 'endUser1',
      sid: 'service1',
      rids: '["role1"]',
      reqID: 'sub-service-req-ID',
    }),
      (req.session = {
        user: {
          email: 'john.doe@email.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        service: {
          roles: ['role1'],
        },
      });

    req.user = {
      sub: 'approver1',
      email: 'approver.one@unit.test',
      organisations: [
        {
          organisation: {
            id: 'organisationId',
            name: 'organisationName',
          },
          role: {
            id: 10000,
            name: 'Approver',
          },
        },
      ],
    };
    req.userOrganisations = [
      {
        organisation: {
          id: 'organisationId',
          name: 'organisationName',
        },
        role: {
          id: 10000,
          name: 'Approver',
        },
      },
    ];
    res = mockResponse();

    getUserDetails.mockReset().mockReturnValue({
      id: 'user1',
      email: 'john.doe@email.com',
      firstName: 'John',
      lastName: 'Doe',
    });

    policyEngine.validate.mockReset().mockReturnValue([]);
    policyEngine.getPolicyApplicationResultsForUser.mockReset().mockReturnValue({
      rolesAvailableToUser: ['role1'],
    });
    PolicyEngine.mockReset().mockImplementation(() => policyEngine);

    listRolesOfService.mockReset().mockReturnValue([
      {
        code: 'role_code',
        id: 'role1',
        name: 'role_name',
        status: {
          id: 'status_id',
        },
      },
    ]);

    checkCacheForAllServices.mockReset().mockReturnValue({
      services: [
        {
          id: 'service1',
          name: 'service name',
        },
      ],
    });

    getUserServiceRequestStatus.mockReset().mockReturnValue(0);

    updateServiceRequest.mockReset().mockReturnValue({
      success: true,
      serviceRequest: {
        status: 1,
      },
    });

    postRejectRolesRequest = require('../../../../src/app/requestService/rejectRolesRequest').post;
    sendSubServiceRequestRejected = jest.fn();
    notificationClient.mockReset().mockImplementation(() => ({
      sendSubServiceRequestRejected,
    }));
  });
  it('then should redirect to `my services` page if there is no user in session', async () => {
    req.session.user = undefined;
    await postRejectRolesRequest(req, res);
    expect(res.redirect.mock.calls).toHaveLength(1);
  });

  it('then it should get all the end-user details', async () => {
    await postRejectRolesRequest(req, res);

    expect(getUserDetails.mock.calls).toHaveLength(1);
    expect(getUserDetails.mock.calls[0][0]).toBe(req);
  });

  it('then it should get all services', async () => {
    await postRejectRolesRequest(req, res);

    expect(checkCacheForAllServices.mock.calls).toHaveLength(1);
  });

  it('then it should list all roles of service', async () => {
    await postRejectRolesRequest(req, res);

    expect(listRolesOfService.mock.calls).toHaveLength(1);
    expect(listRolesOfService.mock.calls[0][0]).toBe('service1');
    expect(listRolesOfService.mock.calls[0][1]).toBe('correlationId');
  });

  it('then it should update the sub-service-request in the DB with rejection', async () => {
    await postRejectRolesRequest(req, res);

    expect(updateServiceRequest.mock.calls).toHaveLength(1);
    expect(updateServiceRequest.mock.calls[0][0]).toBe('sub-service-req-ID');
    expect(updateServiceRequest.mock.calls[0][1]).toBe(-1);
    expect(updateServiceRequest.mock.calls[0][2]).toBe('approver1');
  });

  it('then it should return the `requestAlreadyApproved` view if the request is already approved', async () => {
    updateServiceRequest.mockReset();
    updateServiceRequest.mockReturnValue({
      success: false,
      serviceRequest: {
        status: 1,
      },
    });
    await postRejectRolesRequest(req, res);
    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('requestService/views/requestAlreadyApproved');
  });

  it('then it should return the `requestAlreadyRejected` view if the request is already rejected', async () => {
    updateServiceRequest.mockReset();
    updateServiceRequest.mockReturnValue({
      success: false,
      serviceRequest: {
        status: -1,
      },
    });
    await postRejectRolesRequest(req, res);
    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe('requestService/views/requestAlreadyRejected');
  });

  it('then it should check if email notification is allowed for service', async () => {
    await postRejectRolesRequest(req, res);

    expect(isServiceEmailNotificationAllowed.mock.calls).toHaveLength(1);
  });

  it('then it should send an email notification if notifications are allowed', async () => {
    isServiceEmailNotificationAllowed.mockReset().mockReturnValue(true);
    await postRejectRolesRequest(req, res);

    expect(sendSubServiceRequestRejected.mock.calls).toHaveLength(1);
    expect(sendSubServiceRequestRejected.mock.calls[0][0]).toBe('john.doe@email.com');
    expect(sendSubServiceRequestRejected.mock.calls[0][1]).toBe('John');
    expect(sendSubServiceRequestRejected.mock.calls[0][2]).toBe('Doe');
    expect(sendSubServiceRequestRejected.mock.calls[0][3]).toBe('organisationName');
    expect(sendSubServiceRequestRejected.mock.calls[0][4]).toBe('service name');
    expect(sendSubServiceRequestRejected.mock.calls[0][5]).toStrictEqual(['role_name']);
    expect(sendSubServiceRequestRejected.mock.calls[0][6]).toBe('');
  });

  it('then it should send an email notification if notifications are allowed and include rejection reason if present', async () => {
    isServiceEmailNotificationAllowed.mockReset().mockReturnValue(true);
    req.body.reason = 'Request is not appropiate';
    await postRejectRolesRequest(req, res);

    expect(sendSubServiceRequestRejected.mock.calls).toHaveLength(1);
    expect(sendSubServiceRequestRejected.mock.calls[0][0]).toBe('john.doe@email.com');
    expect(sendSubServiceRequestRejected.mock.calls[0][1]).toBe('John');
    expect(sendSubServiceRequestRejected.mock.calls[0][2]).toBe('Doe');
    expect(sendSubServiceRequestRejected.mock.calls[0][3]).toBe('organisationName');
    expect(sendSubServiceRequestRejected.mock.calls[0][4]).toBe('service name');
    expect(sendSubServiceRequestRejected.mock.calls[0][5]).toStrictEqual(['role_name']);
    expect(sendSubServiceRequestRejected.mock.calls[0][6]).toBe('Request is not appropiate');
  });

  it('then it should should audit the approval', async () => {
    await postRejectRolesRequest(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      'approver.one@unit.test (approverId: approver1) rejected sub-service request for (serviceId: service1) and sub-services (roleIds: ["role1"]) for organisation (orgId: organisationId) for end user (endUserId: endUser1).  - requestId (reqId: sub-service-req-ID)',
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      type: 'sub-service',
      subType: 'sub-service request Rejected',
      userId: 'approver1',
      userEmail: 'approver.one@unit.test',
    });
  });

  it('then a flash message is shown to the user', async () => {
    await postRejectRolesRequest(req, res);

    expect(res.flash.mock.calls).toHaveLength(3);
    expect(res.flash.mock.calls[0][0]).toBe('title');
    expect(res.flash.mock.calls[0][1]).toBe('Success');
    expect(res.flash.mock.calls[1][0]).toBe('heading');
    expect(res.flash.mock.calls[1][1]).toBe('Sub-service request rejected');
    expect(res.flash.mock.calls[2][0]).toBe('message');
    expect(res.flash.mock.calls[2][1]).toBe(
      'The user who raised the request will receive an email to tell them their sub-service access request has been rejected.',
    );
  });

  it('then it should render `rejectRolesRequest` view with error if there are validation messages', async () => {
    policyEngine.validate.mockReturnValue([{ message: 'There has been an error' }]);

    await postRejectRolesRequest(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(`requestService/views/rejectRolesRequest`);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      validationMessages: {
        roles: ['There has been an error'],
      },
    });
  });

  it('then it should redirect the approver to `my-services` page', async () => {
    await postRejectRolesRequest(req, res);
    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe('/my-services');
  });
});
