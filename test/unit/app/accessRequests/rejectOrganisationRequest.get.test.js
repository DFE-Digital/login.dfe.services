jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);
jest.mock("login.dfe.dao", () =>
  require("./../../../utils/jestMocks").mockDao(),
);

const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");
const {
  get,
} = require("./../../../../src/app/accessRequests/rejectOrganisationRequest");

const res = mockResponse();

describe("when rejecting an organisation request", () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      user: {
        sub: "user1",
      },
      params: {
        orgId: "org1",
      },
    });
    res.mockResetAll();
  });

  it("then it should display the reject request view", async () => {
    await get(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/rejectOrganisationRequest",
    );
  });

  it("then it should include csrf token", async () => {
    await get(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
    });
  });

  it("then it should include back link", async () => {
    req.params.rid = 1;
    await get(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      backLink: "/access-requests/organisation-requests/1",
    });
  });

  it("then it should include cancel link", async () => {
    await get(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      cancelLink: "/access-requests/requests",
    });
  });
});
