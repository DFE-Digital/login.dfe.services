const { mockRequest } = require("../../../utils/jestMocks");
jest.mock("../../../../src/infrastructure/organisations");
jest.mock("login.dfe.dao", () => require("../../../utils/jestMocks").mockDao());
jest.mock("../../../../src/infrastructure/account", () => ({
  getById: jest.fn(),
}));
jest.mock("login.dfe.api-client/users", () => {
  return {
    getUserService: jest.fn(),
  };
});

const { getServiceRolesRaw } = require("login.dfe.api-client/services");
jest.mock("login.dfe.api-client/services", () => {
  return {
    getServiceRolesRaw: jest.fn(),
  };
});
const {
  getSubServiceRequestViewModel,
} = require("../../../../src/app/accessRequests/utils");

const {
  checkCacheForAllServices,
} = require("../../../../src/infrastructure/helpers/allServicesAppCache");
jest.mock("../../../../src/infrastructure/helpers/allServicesAppCache", () => {
  return {
    checkCacheForAllServices: jest.fn(),
  };
});

let req;

const model = {
  endUsersEmail: "test@test.com",
  endUsersFamilyName: "User",
  endUsersGivenName: "Test",
  dataValues: {
    createdAt: "2026-01-01",
    service_id: "service1",
    role_ids: "role-id-1,role-id-2",
  },
  organisation: {
    id: "org-1",
    name: "organisation One",
  },
};
const requestId = "req-1";

// Note: For this test, we'd usually mock the result of functions that this function
// calls.  However, for getRoleAndServiceNames, it updates the model as a side effect
// of calling the function so for accuracy, we should also include the output of this
// function in this test (and mock the thing that it calls)
describe("utils.getSubServiceRequestViewModel", () => {
  beforeEach(() => {
    req = mockRequest();
    req.params = {
      rid: "req-1",
    };

    checkCacheForAllServices.mockReset();
    checkCacheForAllServices.mockReturnValue({
      services: [
        {
          id: "service1",
          isExternalService: true,
          isMigrated: true,
          name: "Service One",
          relyingParty: {
            clientId: "serviceOneClient",
          },
        },
        {
          id: "service2",
          isExternalService: true,
          isMigrated: true,
          name: "Service two",
          relyingParty: {
            clientId: "serviceTwoClient",
          },
        },
      ],
    });

    getServiceRolesRaw.mockReset().mockReturnValue([
      {
        id: "role-id-1",
        name: "Test role one",
      },
      {
        id: "role-id-2",
        name: "Test role two",
      },
    ]);
  });

  it("should retrieve and map the request when provided with a model", async () => {
    const result = await getSubServiceRequestViewModel(model, requestId, req);
    expect(result).toStrictEqual({
      role_ids: [
        {
          id: "role-id-1",
        },
        {
          id: "role-id-2",
        },
      ],
      roles: [
        {
          id: "role-id-1",
          name: "Test role one",
        },
        {
          id: "role-id-2",
          name: "Test role two",
        },
      ],
      endUsersEmail: "test@test.com",
      endUsersFamilyName: "User",
      endUsersGivenName: "Test",
      org_name: "organisation One",
      created_date: "2026-01-01",
      org_id: "org-1",
      user_id: undefined,
      service_id: "service1",
      status: undefined,
      actioned_reason: undefined,
      actioned_by: undefined,
      reason: undefined,
      csrfToken: null,
      selectedResponse: " ",
      validationMessages: {},
      currentPage: "requests",
      backLink: "/access-requests/requests",
      cancelLink: "/access-requests/requests",
      Service_name: "Service One",
      clientId: "serviceOneClient",
    });
  });
});
