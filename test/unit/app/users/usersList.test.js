jest.mock("./../../../../src/app/users/utils");
jest.mock("./../../../../src/infrastructure/account", () => ({
  getById: jest.fn(),
}));
jest.mock("login.dfe.api-client/users", () => ({
  searchUsersRaw: jest.fn(),
}));
jest.mock("./../../../../src/infrastructure/utils", () => ({
  mapUserStatus: jest.fn().mockReturnValue({ description: "Active" }),
}));

const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");
const { searchUsersRaw } = require("login.dfe.api-client/users");
const { getApproverOrgsFromReq } = require("./../../../../src/app/users/utils");
const usersList = require("./../../../../src/app/users/usersList");

const OWN_ORG = "11111111-1111-1111-1111-111111111111";
const OTHER_OWN_ORG = "22222222-2222-2222-2222-222222222222";
const VICTIM_ORG = "99999999-9999-9999-9999-999999999999";

const buildUser = (orgId) => ({
  id: "user-2",
  firstName: "Test",
  lastName: "User",
  statusId: 1,
  lastLogin: null,
  email: "test.user@unit.test",
  organisations: [{ id: orgId, name: `Org ${orgId}` }],
});

describe("when searching users in manage users", () => {
  let req;
  let res;

  beforeEach(() => {
    req = mockRequest();
    req.user = { sub: "user-1" };
    req.csrfToken = jest.fn().mockReturnValue("token");
    res = mockResponse();

    getApproverOrgsFromReq.mockReset();
    getApproverOrgsFromReq.mockReturnValue([
      { organisation: { id: OWN_ORG, name: "Own org" } },
      { organisation: { id: OTHER_OWN_ORG, name: "Other own org" } },
    ]);

    searchUsersRaw.mockReset();
    searchUsersRaw.mockImplementation(async ({ filterBy }) => ({
      users: filterBy.organisationIds.map(buildUser),
      numberOfPages: 1,
      totalNumberOfResults: filterBy.organisationIds.length,
    }));
  });

  const renderedModel = () => res.render.mock.calls[0][1];

  it("searches all of the approver's organisations when none are selected", async () => {
    req.method = "GET";
    req.query = {};

    await usersList.get(req, res);

    expect(searchUsersRaw).toHaveBeenCalledTimes(1);
    expect(searchUsersRaw.mock.calls[0][0].filterBy.organisationIds).toEqual([
      OWN_ORG,
      OTHER_OWN_ORG,
    ]);
  });

  it("searches only the selected organisation when the caller is its approver", async () => {
    req.method = "GET";
    req.query = { selectedOrganisation: OTHER_OWN_ORG };

    await usersList.get(req, res);

    expect(searchUsersRaw.mock.calls[0][0].filterBy.organisationIds).toEqual([
      OTHER_OWN_ORG,
    ]);
    expect(renderedModel().selectedOrganisations).toEqual([OTHER_OWN_ORG]);
  });

  it("does not search an organisation the caller is not an approver of (GET)", async () => {
    req.method = "GET";
    req.query = { selectedOrganisation: VICTIM_ORG };

    await usersList.get(req, res);

    expect(searchUsersRaw).not.toHaveBeenCalled();
    expect(renderedModel().usersForOrganisation.users).toEqual([]);
    expect(renderedModel().selectedOrganisations).toEqual([]);
  });

  it("does not search an organisation the caller is not an approver of (POST)", async () => {
    req.method = "POST";
    req.body = { selectedOrganisation: VICTIM_ORG, searchCriteria: "smith" };

    await usersList.post(req, res);

    expect(searchUsersRaw).not.toHaveBeenCalled();
    expect(renderedModel().usersForOrganisation.users).toEqual([]);
  });

  it("drops unauthorised organisations from a comma separated selection", async () => {
    req.method = "GET";
    req.query = { selectedOrganisation: `${OWN_ORG},${VICTIM_ORG}` };

    await usersList.get(req, res);

    expect(searchUsersRaw.mock.calls[0][0].filterBy.organisationIds).toEqual([
      OWN_ORG,
    ]);
    expect(renderedModel().selectedOrganisations).toEqual([OWN_ORG]);
  });

  it("drops unauthorised organisations from an array selection", async () => {
    req.method = "POST";
    req.body = { selectedOrganisation: [VICTIM_ORG, OTHER_OWN_ORG] };

    await usersList.post(req, res);

    expect(searchUsersRaw.mock.calls[0][0].filterBy.organisationIds).toEqual([
      OTHER_OWN_ORG,
    ]);
  });

  it("applies the same restriction to name searches", async () => {
    req.method = "POST";
    req.body = {
      selectedOrganisation: `${VICTIM_ORG},${OWN_ORG}`,
      searchCriteria: "smith",
    };

    await usersList.post(req, res);

    const args = searchUsersRaw.mock.calls[0][0];
    expect(args.searchCriteria).toBe("smith*");
    expect(args.filterBy.organisationIds).toEqual([OWN_ORG]);
  });

  it("does not throw or search when selectedOrganisation is an object", async () => {
    req.method = "POST";
    req.body = { selectedOrganisation: { [VICTIM_ORG]: "x" } };

    await usersList.post(req, res);

    expect(searchUsersRaw).not.toHaveBeenCalled();
    expect(renderedModel().usersForOrganisation.users).toEqual([]);
  });

  it("does not search when the caller has no approver organisations", async () => {
    getApproverOrgsFromReq.mockReturnValue([]);
    req.method = "GET";
    req.query = {};

    await usersList.get(req, res);

    expect(searchUsersRaw).not.toHaveBeenCalled();
    expect(renderedModel().usersForOrganisation.users).toEqual([]);
  });
});
