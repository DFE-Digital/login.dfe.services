jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/organisations");

const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");
const {
  post,
} = require("./../../../../src/app/requestOrganisation/selectOrganisation");
const {
  searchOrganisations,
  getRequestsForOrganisation,
  getOrganisationAndServiceForUserV2,
  getCategories,
} = require("./../../../../src/infrastructure/organisations");

const res = mockResponse();

describe("when showing the searching for a organisation", () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      user: {
        sub: "user1",
      },
      body: {
        criteria: "organisation one",
        page: 1,
      },
      method: "POST",
    });

    searchOrganisations.mockReset().mockReturnValue({
      organisations: [{ id: "org1" }],
      totalNumberOfPages: 2,
      totalNumberOfRecords: 49,
      page: 1,
    });

    getCategories.mockReset().mockReturnValue([
      {
        id: "001",
        name: "some category name",
      },
    ]);

    getRequestsForOrganisation.mockReset();
    getRequestsForOrganisation.mockReturnValue([
      {
        id: "requestId",
        org_id: "organisationId",
        org_name: "organisationName",
        user_id: "user2",
        status: {
          id: 0,
          name: "pending",
        },
        created_date: "2019-08-12",
      },
    ]);
    getOrganisationAndServiceForUserV2.mockReset();
    getOrganisationAndServiceForUserV2.mockReturnValue([
      {
        organisation: {
          id: "organisationId",
        },
      },
    ]);

    res.mockResetAll();
  });

  it("then it should use criteria and page to search for organisations", async () => {
    await post(req, res);

    expect(searchOrganisations.mock.calls).toHaveLength(1);
    expect(searchOrganisations.mock.calls[0][0]).toBe("organisation one");
    expect(searchOrganisations.mock.calls[0][1]).toBe(1);
    expect(searchOrganisations.mock.calls[0][2]).toMatchObject(["001"]);
    expect(searchOrganisations.mock.calls[0][3]).toMatchObject([1, 3, 4]);
    expect(searchOrganisations.mock.calls[0][4]).toBe("correlationId");
  });

  it("then it should render search view with results", async () => {
    await post(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestOrganisation/views/search",
    );
    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
      criteria: "organisation one",
      organisations: [
        {
          id: "org1",
        },
      ],
      page: 1,
      totalNumberOfPages: 2,
      totalNumberOfRecords: 49,
    });
  });

  it("then it should update session with selected organisation", async () => {
    req.body = {
      selectedOrganisation: "org1",
    };

    await post(req, res);

    expect(req.session.organisationId).toBe("org1");
  });

  it("should not include category 011 or 003", async () => {
    getCategories.mockReset().mockReturnValue([
      {
        id: "001",
        name: "some category name",
      },
      {
        id: "003",
        name: "A filtered out category",
      },
      {
        id: "011",
        name: "Another filtered out category",
      },
    ]);
    req.body = {
      selectedOrganisation: "org1",
    };

    await post(req, res);
    expect(searchOrganisations).toHaveBeenCalledWith(
      "",
      1,
      ["001"],
      [1, 3, 4],
      "correlationId",
      ["Department for Education"],
    );

    expect(req.session.organisationId).toBe("org1");
  });

  it("then it should redirect to review page if organisation selected", async () => {
    req.body = {
      selectedOrganisation: "org1",
    };

    await post(req, res);

    expect(res.sessionRedirect.mock.calls).toHaveLength(1);
    expect(res.sessionRedirect.mock.calls[0][0]).toBe("review");
    expect(res.render.mock.calls).toHaveLength(0);
  });

  it("then it should render with error if already apart of org", async () => {
    req.body.selectedOrganisation = "organisationId";

    await post(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestOrganisation/views/search",
    );
    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
      criteria: "organisation one",
      organisations: [
        {
          id: "org1",
        },
      ],
      page: 1,
      totalNumberOfPages: 2,
      totalNumberOfRecords: 49,
      validationMessages: {
        selectedOrganisation: "You are already linked to this organisation",
      },
    });
  });

  it("then it should render with error if outstanding request for org", async () => {
    req.body.selectedOrganisation = "org1";

    getRequestsForOrganisation.mockReturnValue([
      {
        id: "requestId",
        org_id: "organisationId",
        org_name: "organisationName",
        user_id: "user1",
        status: {
          id: 0,
          name: "pending",
        },
        created_date: "2019-08-12",
      },
    ]);

    await post(req, res);

    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestOrganisation/views/search",
    );
    expect(res.render.mock.calls[0][1]).toMatchObject({
      csrfToken: "token",
      criteria: "organisation one",
      organisations: [
        {
          id: "org1",
        },
      ],
      page: 1,
      totalNumberOfPages: 2,
      totalNumberOfRecords: 49,
      validationMessages: {
        selectedOrganisation: "You have already requested this organisation",
      },
    });
  });
});
