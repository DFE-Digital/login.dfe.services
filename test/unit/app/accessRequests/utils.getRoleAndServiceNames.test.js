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
  getRoleAndServiceNames,
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
  service_id: "service1",
  role_ids: [
    {
      id: "role-id-2",
    },
  ],
};
const requestId = "req-1";

describe("utils.getRoleAndServiceNames", () => {
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
    const result = await getRoleAndServiceNames(model, requestId, req);
    expect(result).toStrictEqual({
      Service_name: "Service One",
      clientId: "serviceOneClient",
      role_ids: [
        {
          id: "role-id-2",
        },
      ],
      roles: [
        {
          id: "role-id-2",
          name: "Test role two",
        },
      ],
      service_id: "service1",
    });
  });
});
