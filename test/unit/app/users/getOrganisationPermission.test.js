const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");

jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);
jest.mock("./../../../../src/app/users/utils");

const res = mockResponse();
const getOrganisationPermission =
  require("../../../../src/app/users/organisationPermission").get;

describe("when displaying the organisation permission level page", () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      session: {
        user: {
          organisation: "organisationId",
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@education.gov.uk",
          isInvite: true,
        },
      },
      params: {
        orgId: "organisationId",
      },
      userOrganisations: [
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
        {
          organisation: {
            id: "organisationId1",
            name: "organisationName1",
          },
          role: {
            id: 0,
            name: "category name1",
          },
        },
      ],
    });
  });

  it("then it should redirect to users list if no user in session", async () => {
    req.session.user = undefined;
    await getOrganisationPermission(req, res);

    expect(res.redirect.mock.calls.length).toBe(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/approvals/users");
  });

  it("then it should include the organisation details", async () => {
    await getOrganisationPermission(req, res);

    expect(res.render.mock.calls[0][1].organisation).toMatchObject({
      id: "organisationId",
      name: "organisationName",
    });
  });

  it("then it should include the user name", async () => {
    await getOrganisationPermission(req, res);

    expect(res.render.mock.calls[0][1].user).toBe("John Doe");
  });

  it("then it should return the organisation permission view", async () => {
    await getOrganisationPermission(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "users/views/organisationPermission",
    );
  });

  it("then the back link should redirect to Confirm user page if the user already have a DfE Sign-in Account", async () => {
    req.params.uid = "uuid-12345-12345";

    await getOrganisationPermission(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][1].backLink).toBe(
      `/approvals/${req.params.orgId}/users/${req.params.uid}/confirm-user`,
    );
  });

  it("then the back link should redirect to New User page if the user don`t have a DfE Sign-in Account", async () => {
    await getOrganisationPermission(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][1].backLink).toBe(
      `/approvals/${req.params.orgId}/users/new-user`,
    );
  });

  describe("when a savedInvite exists in the session from a concurrent /my-services visit", () => {
    const savedInviteState = {
      isInvite: true,
      email: "invitee@test.com",
      firstName: "New",
      lastName: "User",
      permission: 0,
      services: [],
    };

    it("then it should restore the invite session when params.uid is undefined (new-user invite)", async () => {
      req.session.user = { uid: "approver1", services: [], orgCount: 0 };
      req.session.savedInvite = { ...savedInviteState };
      req.params.uid = undefined;

      await getOrganisationPermission(req, res);

      expect(req.session.savedInvite).toBeUndefined();
      expect(req.session.user.isInvite).toBe(true);
      expect(req.session.user.firstName).toBe("New");
    });

    it("then it should restore the invite session when params.uid is a different user (existing-user invite)", async () => {
      req.session.user = { uid: "approver1", services: [], orgCount: 0 };
      req.session.savedInvite = { ...savedInviteState };
      req.params.uid = "some-other-user";

      await getOrganisationPermission(req, res);

      expect(req.session.savedInvite).toBeUndefined();
      expect(req.session.user.isInvite).toBe(true);
    });

    it("then it should not restore the invite session when params.uid matches the approver (self-service route)", async () => {
      req.session.user = { uid: "approver1", services: [], orgCount: 0 };
      req.session.savedInvite = { ...savedInviteState };
      req.params.uid = "approver1";
      req.user = { sub: "approver1" };

      await getOrganisationPermission(req, res);

      expect(req.session.savedInvite).toBeDefined();
      expect(req.session.user.isInvite).toBeUndefined();
    });
  });
});
