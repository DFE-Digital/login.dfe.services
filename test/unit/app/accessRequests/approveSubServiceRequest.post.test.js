const { mockRequest, mockResponse, mockAdapterConfig } = require('../../../utils/jestMocks');
const { getSubServiceRequestVieModel, getAndMapServiceRequest, getNewRoleDetails } = require('../../../../src/app/accessRequests/utils');
const {updateServiceRequest} = require('../../../../src/app/requestService/utils');
const {post } = require('../../../../src/app/accessRequests/reviewSubServiceRequest');
const NotificationClient = require('login.dfe.notifications.client');
const sendAccessRequest = jest.fn();

const Account = require('../../../../src/infrastructure/account');
jest.mock('login.dfe.policy-engine');
jest.mock('../../../../src/infrastructure/config', () => {
  return mockAdapterConfig()
});
jest.mock('../../../../src/infrastructure/logger', () => require('../../../utils/jestMocks').mockLogger());
jest.mock('./../../../../src/infrastructure/account', () => ({
  fromContext: jest.fn(),
  getById: jest.fn(),
}));

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

jest.mock('../../../../src/infrastructure/config', () => {
  return mockAdapterConfig();
});
jest.mock('login.dfe.dao', () => {
  return {
    services: {
      getUserServiceRequest: jest.fn(),
      updateUserPendingServiceRequest: jest.fn(),
    },
  };
});
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
  role_ids :['role1'],
  service_id :'service1',
  status : 0,
  actioned_reason : 'Pending',
  actioned_by : null,
  reason : 'Pending',
  csrfToken : null,
  selectedResponse: null,
  validationMessages:{selectedResponse: 'Approve or Reject must be selected'},
  currentPage: 'requests',
  Role_name: 'role  one',
  service_name: 'service one',
  roles: listRoles
};

const model = {
  _changed: 0,
  _options: null,
  _previousDataValues: null,
  approverEmail: '',
  approverName:'',
  dataValues : {id: 'request1', actioned_by: null, actioned_at: null,actioned_reason:'Pending', createdAt: new Date(),organisation_id:'org1', reason:'',role_ids: ['role1'], service_id: 'service1', status: 0, updatedAt: new Date(),user_id:'endUser1'},
  endUsersEmail: 'b@b.gov.uk', 
  endUsersFamilyName: 'b', 
  endUsersGvenName:'b',
  isNewRecord: false,
  organisation:{id: 'org1', name: 'accademic organisatioon'}
};
jest.mock('../../../../src/app/users/utils');


describe('When reviewing a sub-service request for approving', () => {
  let req;
  let res;

  let postSubServiceRequest;

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
        selectedResponse: 'approve',
      },
      model : {
        _changed: 0,
        _options: null,
        _previousDataValues: null,
        approverEmail: '',
        approverName:'',
        dataValues : {id: 'request1', actioned_by: null, actioned_at: null,actioned_reason:'Pending', createdAt: new Date(),organisation_id:'org1', reason:'',role_ids: 'role1', service_id: 'service1', status: 0, updatedAt: new Date(),user_id:'endUser1'},
        endUsersEmail: 'b@b.gov.uk', 
        endUsersFamilyName: 'b', 
        endUsersGvenName:'b',
        isNewRecord: false,
        organisation:{id: 'org1', name: 'accademic organisatioon'}
      },
      viewModel : 
        {
          endUsersEmail : 'b@b.gov.uk',
          endUsersFamilyName :'b',
          endUsersGivenName : 'b',
          org_name :'org1',
          org_id : 'org1',
          user_id : 'endUser1',
          role_ids : 'role1',
          service_id :'service1',
          status : 0,
          actioned_reason : 'Pending',
          actioned_by : null,
          reason : 'Pending',
          csrfToken : null,
          selectedResponse: null,
          validationMessages: {selectedResponse: 'Approve or Reject must be selected'},
          currentPage: 'requests',
          Role_name: 'role  one',
          service_name: 'service one',
        }});
      
   
    res = mockResponse();
    sendAccessRequest.mockReset();
    
    Account.getById
    .mockReset()
    .mockReturnValue([
      { claims: { sub: 'user1', given_name: 'User', family_name: 'One', email: 'user.one@unit.tests' } },
     
    ]);

    updateServiceRequest.mockReset();
    updateServiceRequest.mockReturnValue(request = {success : true});

    getAndMapServiceRequest.mockReset();
    getAndMapServiceRequest.mockReturnValue(model);

    getSubServiceRequestVieModel.mockReset();
    getSubServiceRequestVieModel.mockReturnValue(viewModel);

    getNewRoleDetails.mockReset();
    getNewRoleDetails.mockReturnValue(listRoles);

    postSubServiceRequest = require('../../../../src/app/accessRequests/reviewSubServiceRequest').post;
  });

  it('then it should render Success when its approved correctly', async () => {
    await post(req, res);
    expect(res.flash.mock.calls).toHaveLength(3);
    expect(res.flash.mock.calls[0][0]).toBe('title');
    expect(res.flash.mock.calls[0][1]).toBe('Success');
  });

  it('then it should render an error if the selectedResponse is missing', async () => {
    req.body.selectedResponse = null;
    await post(req, res);
    expect(res.render.mock.calls[0][0]).toBe('accessRequests/views/reviewSubServiceRequest');
   
  });

});
