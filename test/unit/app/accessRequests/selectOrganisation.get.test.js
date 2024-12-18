const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");

jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);

describe("when displaying the multiple organisation requests selection", () => {
  let req;
  let res;

  let getMultipleOrgSelection;

  beforeEach(() => {
    req = mockRequest();
    req.user = {
      sub: "user1",
      email: "user.one@unit.test",
      organisations: [
        {
          organisation: {
            id: "organisationId",
            name: "organisationName",
          },
          role: {
            id: 0,
            name: "category name",
          },
        },
      ],
    };
    req.userOrganisations = [
      {
        organisation: {
          id: "organisationId",
          name: "organisationName",
        },
        role: {
          id: 10000,
          name: "category name",
        },
      },
    ];
    req.organisationRequests = [
      {
        id: "requestId",
        org_id: "organisationId",
        org_name: "organisationName",
        user_id: "user1",
        status: {
          id: 0,
          name: "pending",
        },
      },
    ];
    res = mockResponse();

    getMultipleOrgSelection =
      require("./../../../../src/app/accessRequests/selectOrganisation").get;
  });

  it("then it should return the multiple orgs view", async () => {
    await getMultipleOrgSelection(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/selectOrganisation",
    );
  });

  it("then it should include csrf token in model", async () => {
    await getMultipleOrgSelection(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
    });
  });

  it("then it should include the organisations with requests", async () => {
    await getMultipleOrgSelection(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      organisations: [
        {
          naturalIdentifiers: [],
          organisation: {
            id: "organisationId",
            name: "organisationName",
          },
          requestCount: 1,
          role: {
            id: 10000,
            name: "category name",
          },
        },
      ],
    });
  });

  it("then it should fallback and show all approvers organisations if no requests", async () => {
    req.organisationRequests = [];
    await getMultipleOrgSelection(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      organisations: [
        {
          naturalIdentifiers: [],
          organisation: {
            id: "organisationId",
            name: "organisationName",
          },
          role: {
            id: 10000,
            name: "category name",
          },
        },
      ],
    });
  });
});
