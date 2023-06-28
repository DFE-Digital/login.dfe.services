const { mockRequest, mockResponse, mockAdapterConfig } = require('../../../utils/jestMocks');
const { getSubServiceRequestVieModel, getAndMapServiceRequest, getNewRoleDetails } = require('../../../../src/app/accessRequests/utils');
const {updateServiceRequest} = require('../../../../src/app/requestService/utils');
const {post } = require('../../../../src/app/accessRequests/rejectSubServiceRequest');
//const { checkCacheForAllServices } = require('../../../../src/infrastructure/helpers/allServicesAppCache');
//const NotificationClient = require('login.dfe.notifications.client');


const Account = require('../../../../src/infrastructure/account');
//jest.mock('login.dfe.policy-engine');
jest.mock('../../../../src/infrastructure/config', () => {
  return mockAdapterConfig()
});
const sendAccessRequest = jest.fn();
jest.mock('../../../../src/infrastructure/logger', () => require('../../../utils/jestMocks').mockLogger());
jest.mock('./../../../../src/infrastructure/account', () => ({
  fromContext: jest.fn(),
  getById: jest.fn(),
}));
/*jest.mock('../../../../src/infrastructure/helpers/allServicesAppCache', () => {
  return {
    checkCacheForAllServices: jest.fn(),
  };
});*/
jest.mock('../../../../src/app/accessRequests/utils', () => {
  return {
    getAndMapServiceRequest: jest.fn(),
    getSubServiceRequestVieModel: jest.fn(),
    getNewRoleDetails: jest.fn(),
  };
});

jest.mock('../../../../src/app/requestService/utils', () => {
    return {
        updateServiceRequest: jest.fn(),
    };
  });

jest.mock('login.dfe.dao', () => {
  return {
    services: {
      getUserServiceRequest: jest.fn(),
      updateUserPendingServiceRequest: jest.fn(),
    },
  };
});
jest.mock('../../../../src/app/users/utils');
const listRoles = [{
  code:'ASP_School_Anon', id: '01379D9F-A6DF-4810-A6C4-5468CBD41E42',
  name: 'ASP School Anon',
  numericId: '124'},{
    code:'ASP_School_Anon', id: '01379D9F-A6DF-4810-A6C4-5468CBD41E42',
    name: 'ASP School Anon',
    numericId: '124'},{
      code:'ASP_School_Anon', id: '01379D9F-A6DF-4810-A6C4-5468CBD41E42',
      name: 'ASP School Anon',
      numericId: '124'},{
        code:'ASP_School_Anon', id: '01379D9F-A6DF-4810-A6C4-5468CBD41E42',
        name: 'ASP School Anon',
        numericId: '124'},{
          code:'ASP_School_Anon', id: '01379D9F-A6DF-4810-A6C4-5468CBD41E42',
          name: 'ASP School Anon',
          numericId: '124'}];
const viewModel = {
  endUsersEmail : 'b@b.gov.uk',
  endUsersFamilyName :'b',
  endUsersGivenName : 'b',
  org_name :'org1',
  org_id : 'org1',
  user_id : 'endUser1',
  role_ids : ['role1'],
  service_id :'service1',
  status : 0,
  actioned_reason : 'Pending',
  actioned_by : null,
  reason : 'Pending',
  csrfToken : null,
  selectedResponse: 'reject',
  validationMessages: {},
  currentPage: 'requests',
  Role_name: 'role  one',
  service_name: 'service one',
  roles: listRoles,
};
const model = {
    csrfToken: 'abcde',
    title: 'Reason for rejection - DfE Sign-in',
    backLink: `/access-requests/subService-requests/request1`,
    cancelLink: `/access-requests/requests`,
    reason: 'not needed',
    validationMessages: {},
    currentPage: 'requests',
}
const buildModel = {
  _changed: 0,
  _options: null,
  _previousDataValues: null,
  approverEmail: '',
  approverName:'',
  dataValues : {id: 'request1', actioned_by: null, actioned_at: null,actioned_reason:'Pending', createdAt: new Date(),organisation_id:'org1', reason:'not needed',role_ids: ['role1'], service_id: 'service1', status: 0, updatedAt: new Date(),user_id:'endUser1'},
  endUsersEmail: 'b@b.gov.uk', 
  endUsersFamilyName: 'b', 
  endUsersGvenName:'b',
  isNewRecord: false,
  organisation:{id: 'org1', name: 'accademic organisatioon'}
};



describe('When actioning a sub-service request for rejection', () => {
  let req;
  let res;
  beforeEach(() => {
    req = mockRequest({
        params : {
        rid: 'sub-service-req-ID',
      },
      session:{
        user:{ sub: 'user1',
        email: 'email@email.com',},
      },
      user: {
        sub: 'user1',
        email: 'email@email.com',
      },
      body: {
        selectedResponse: 'reject',
        reason: 'not needed',
      },
      buildmodel : {
        _changed: 0,
        _options: null,
        _previousDataValues: null,
        approverEmail: '',
        approverName:'',
        dataValues : {id: 'request1', actioned_by: null, actioned_at: null,actioned_reason:'Pending', createdAt: new Date(),organisation_id:'org1', reason:'not needed',role_ids: ['role1'], service_id: 'service1', status: 0, updatedAt: new Date(),user_id:'endUser1'},
        endUsersEmail: 'b@b.gov.uk', 
        endUsersFamilyName: 'b', 
        endUsersGvenName:'b',
        isNewRecord: false,
        organisation:{id: 'org1', name: 'accademic organisatioon'}
      },
      model: {
        csrfToken: 'abcde',
        title: 'Reason for rejection - DfE Sign-in',
        backLink: `/access-requests/subService-requests/request1`,
        cancelLink: `/access-requests/requests`,
        reason: 'not needed',
        validationMessages: {},
        currentPage: 'requests',
      },
      viewModel : 
        {
          endUsersEmail : 'b@b.gov.uk',
          endUsersFamilyName :'b',
          endUsersGivenName : 'b',
          org_name :'org1',
          org_id : 'org1',
          user_id : 'endUser1',
          role_ids : ['role1'],
          service_id :'service1',
          status : 0,
          actioned_reason : 'Pending',
          actioned_by : null,
          reason : 'not needed',
          csrfToken : null,
          selectedResponse: 'reject',
          validationMessages: {},
          currentPage: 'requests',
          Role_name: 'role  one',
          service_name: 'service one',
          roles: listRoles,
        }});
      
     
    res = mockResponse();
    sendAccessRequest.mockReset();
    
    Account.getById
    .mockReset()
    .mockReturnValue(
      { claims: { sub: 'user1', given_name: 'User', family_name: 'One', email: 'user.one@unit.tests' } }
    );

    updateServiceRequest.mockReset();
    updateServiceRequest.mockReturnValue(request = {success : true});

    getAndMapServiceRequest.mockReset();
    getAndMapServiceRequest.mockReturnValue(buildModel);

    getSubServiceRequestVieModel.mockReset();
    getSubServiceRequestVieModel.mockReturnValue(viewModel);

    getNewRoleDetails.mockReset();
    getNewRoleDetails.mockReturnValue(listRoles);
  });

  it('then it should redirect to summary request view', async () => {
    await post(req, res);
    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe('/access-requests/requests');  
    expect(res.flash.mock.calls[0][0]).toBe('title');
    expect(res.flash.mock.calls[0][1]).toBe('Success');
    expect(res.flash.mock.calls[1][0]).toBe('heading');
    expect(res.flash.mock.calls[1][1]).toBe('Sub-service request rejected');
    expect(res.flash.mock.calls[2][0]).toBe('message');
    expect(res.flash.mock.calls[2][1]).toBe('The user who raised the request will receive an email to tell them their sub-service access request has been rejected.');
  });


  
});