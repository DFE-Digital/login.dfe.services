const { mockRequest, mockResponse } = require("../../../utils/jestMocks");

jest.mock("./../../../../src/infrastructure/config", () =>
  require("../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("../../../utils/jestMocks").mockLogger(),
);
jest.mock("./../../../../src/app/users/utils");

const res = mockResponse();
const postOrganisationPermission =
  require("../../../../src/app/users/organisationPermission").post;

describe("when select the organisation permission level", () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      body: {
        selectedLevel: 10000,
      },
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

  it("then it should render validation message if no permission level selected", async () => {
    req.body.selectedLevel = undefined;

    await postOrganisationPermission(req, res);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "users/views/organisationPermission",
    );
    expect(res.render.mock.calls[0][1].validationMessages).toEqual({
      selectedLevel: "Please select a permission level",
    });
  });

  it("then it should render validation message if invalid permission level", async () => {
    req.body.selectedLevel = 10;
    await postOrganisationPermission(req, res);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "users/views/organisationPermission",
    );
    expect(res.render.mock.calls[0][1].validationMessages).toEqual({
      selectedLevel: "Please select a permission level",
    });
  });

  it("then it should redirect to users list if no user in session", async () => {
    req.session.user = undefined;
    await postOrganisationPermission(req, res);

    expect(res.redirect.mock.calls.length).toBe(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/approvals/users");
  });

  it("then it should set the permission to 10000 if the selection is Approver", async () => {
    await postOrganisationPermission(req, res);
    expect(req.session.user.permission).toBe(10000);
  });

  it("then it should set the permission to 0 if the selection is End user", async () => {
    req.body.selectedLevel = 0;
    await postOrganisationPermission(req, res);
    expect(req.session.user.permission).toBe(0);
  });

  it("then it should redirect to the associate-services page if the selection is not reviewed and it is valid", async () => {
    await postOrganisationPermission(req, res);
    expect(res.sessionRedirect.mock.calls).toHaveLength(1);
    expect(res.sessionRedirect.mock.calls[0][0]).toBe(`associate-services`);
  });

  it("then it should redirect to the confirm new user page if the selection is reviewed and it is valid", async () => {
    req.query.review = "true";

    await postOrganisationPermission(req, res);
    expect(res.sessionRedirect.mock.calls).toHaveLength(1);
    expect(res.sessionRedirect.mock.calls[0][0]).toBe(`confirm-new-user`);
  });
});
