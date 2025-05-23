const { mockRequest, mockResponse } = require("../../../utils/jestMocks");
const {
  isOrgEndUser,
  isRemoveService,
} = require("../../../../src/app/users/utils");

jest.mock("./../../../../src/infrastructure/config", () =>
  require("../../../utils/jestMocks").mockConfig(),
);

jest.mock("../../../../src/app/users/utils", () => {
  return {
    isOrgEndUser: jest.fn(),
    isRemoveService: jest.fn(),
    getOrgNaturalIdentifiers: jest.fn(),
  };
});

const mockServiceOrganisations = [
  {
    Organisation: {
      id: "organisationId",
      naturalIdentifiers: [],
      statusName: undefined,
    },
    Service: {
      id: "serviceId",
    },
    id: "serviceOrganisationId",
  },
];

jest.mock("login.dfe.dao", () => {
  return {
    organisation: {
      getStatusNameById: jest.fn(),
    },
    services: {
      getUserServicesWithOrganisationOnlyApprover: () =>
        mockServiceOrganisations,
      getFilteredUserServicesWithOrganisation: () => mockServiceOrganisations,
    },
  };
});

describe("when selecting a service (with organisation)", () => {
  let req;
  let res;

  let postSelectServiceWithOrg;

  beforeEach(() => {
    isOrgEndUser.mockReset();
    req = mockRequest();
    req.user = {
      sub: "userId",
    };
    req.body = {
      selectedServiceOrganisation: "serviceOrganisationId",
    };
    req.session = {
      user: {},
    };
    res = mockResponse();
    postSelectServiceWithOrg =
      require("../../../../src/app/users/selectServiceWithOrganisation").post;
  });

  it("if approver, then it should redirect to edit the selected service", async () => {
    await postSelectServiceWithOrg(req, res);
    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(
      `/approvals/organisationId/users/userId/services/serviceId`,
    );
  });

  it("if end user, then it should redirect to request edit the selected service", async () => {
    isOrgEndUser.mockReset();
    isOrgEndUser.mockReturnValue(true);
    await postSelectServiceWithOrg(req, res);
    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(
      "/request-service/organisationId/users/userId/edit-services/serviceId",
    );
  });

  it("if approver and remove service, then it should redirect to remove the selected service", async () => {
    isRemoveService.mockReset();
    isRemoveService.mockReturnValue(true);
    await postSelectServiceWithOrg(req, res);
    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe(
      "/approvals/organisationId/users/userId/services/serviceId/remove-service",
    );
  });

  it("then it should render validation message if no selected service", async () => {
    req.body.selectedServiceOrganisation = undefined;

    await postSelectServiceWithOrg(req, res);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      `users/views/selectServiceWithOrganisation`,
    );
    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
      selectedServiceOrganisation: undefined,
      serviceOrganisations: mockServiceOrganisations,
      currentPage: "services",
      validationMessages: {
        serviceOrganisation: "Please select a service",
      },
      backLink: "/my-services",
    });
  });
});
