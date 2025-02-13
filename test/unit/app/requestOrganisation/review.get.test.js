jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);
jest.mock("./../../../../src/infrastructure/organisations");

const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");
const { get } = require("./../../../../src/app/requestOrganisation/review");
const res = mockResponse();
const {
  getOrganisationById,
} = require("./../../../../src/infrastructure/organisations");

describe("when showing the review request org page", () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      user: {
        sub: "user1",
      },
      session: {
        organisationId: "org1",
      },
    });
    getOrganisationById.mockReset().mockReturnValue({
      id: "org1",
      name: "organisation two",
      category: {
        id: "001",
        name: "Establishment",
      },
    });
    res.mockResetAll();
  });

  it("then it should redirect to search if no orgId in session", async () => {
    req.session.organisationId = undefined;

    await get(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("search");
  });

  it("then it should display the select organisation review page", async () => {
    await get(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestOrganisation/views/review",
    );
  });

  it("then it should get the organisation by id", async () => {
    await get(req, res);

    expect(getOrganisationById.mock.calls).toHaveLength(1);
    expect(getOrganisationById.mock.calls[0][0]).toBe("org1");
    expect(getOrganisationById.mock.calls[0][1]).toBe("correlationId");
  });

  it("then it should include csrf token", async () => {
    await get(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
    });
  });

  it("then it should include the organisation details", async () => {
    await get(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      organisation: {
        id: "org1",
        name: "organisation two",
        category: {
          id: "001",
          name: "Establishment",
        },
      },
    });
  });
});
