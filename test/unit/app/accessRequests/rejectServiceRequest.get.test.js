const {
  mockRequest,
  mockResponse,
  mockAdapterConfig,
  mockLogger,
} = require("../../../utils/jestMocks");
const {
  get,
} = require("../../../../src/app/accessRequests/rejectServiceRequest");

jest.mock("../../../../src/infrastructure/config", () => mockAdapterConfig());
jest.mock("../../../../src/infrastructure/logger", () => mockLogger());
jest.mock("login.dfe.dao", () => require("../../../utils/jestMocks").mockDao());

const res = mockResponse();

describe("when reviewing a service request", () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      user: {
        sub: "approver-user-id",
        given_name: "Jane",
        family_name: "Doe",
        email: "jane.doe@education",
      },
      params: {
        rid: "request-id",
        orgId: "organisation-id",
        uid: "end-user-id",
        sid: "service-id",
        rolesIds: "role-id-1",
      },
    });

    res.mockResetAll();
  });

  it("then it should display the review service request view", async () => {
    await get(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/rejectServiceRequest",
    );
  });

  it("then it should include csrf token", async () => {
    await get(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
    });
  });

  it("then it should include the page title", async () => {
    await get(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      title: "Reason for rejection",
    });
  });

  it("then it should include the cancel link", async () => {
    await get(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      cancelLink: "/access-requests/requests",
    });
  });

  it("then it should include the back and cancel links", async () => {
    await get(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      cancelLink: "/access-requests/requests",
      backLink:
        "/access-requests/service-requests/request-id/services/service-id/roles/role-id-1",
    });
  });

  it("then it should include the current navigation details", async () => {
    await get(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({
      currentPage: "requests",
    });
  });
});
