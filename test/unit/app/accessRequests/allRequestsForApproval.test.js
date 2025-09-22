const { mockRequest, mockResponse } = require("../../../utils/jestMocks");
jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);
jest.mock("login.dfe.dao", () =>
  require("./../../../utils/jestMocks").mockDao(),
);

jest.mock("./../../../../src/infrastructure/account", () => ({
  fromContext: jest.fn(),
  getUsersById: jest.fn(),
}));

jest.mock("login.dfe.api-client/services");
const {
  getAllRequestTypesForApproverRaw,
} = require("login.dfe.api-client/services");

jest.mock("../../../../src/app/helpers/generateRequestSummaryHelper", () => ({
  generateRequestSummary: jest.fn(),
}));

const Account = require("../../../../src/infrastructure/account");

describe("when displaying the pending access requests for approver ", () => {
  let req;
  let res;

  let getAllRequestsForApproval;
  let postAllRequestsForApproval;

  beforeEach(() => {
    req = mockRequest();
    req.user = {
      sub: "user1",
      email: "user.one@unit.test",
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
    req.method = "GET";
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

    getAllRequestTypesForApproverRaw.mockReset();
    getAllRequestTypesForApproverRaw.mockReturnValue({
      requests: [
        {
          id: "org-req-id-1",
          org_id: "org-id-1",
          org_name: "Department for Education",
          user_id: "user-id-1",
          created_date: "2023-05-10T12:00:35.169Z",
          request_type: {
            id: "organisation",
            name: "Organisation access",
          },
          status: {
            id: 0,
            name: "Pending",
          },
        },
        {
          id: "service-req-id-1",
          org_id: "org-id-1",
          org_name: "Department for Education",
          user_id: "user-id-2",
          created_date: "2023-05-09T14:36:15.387Z",
          request_type: {
            id: "service",
            name: "Service access",
          },
          status: {
            id: 0,
            name: "Pending",
          },
        },
        {
          id: "sub-service-req-id-1",
          org_id: "org-id-1",
          org_name: "Department for Education",
          user_id: "user-id-2",
          created_date: "2023-04-24T16:22:14.704Z",
          request_type: {
            id: "subService",
            name: "Sub-service access",
          },
          status: {
            id: 0,
            name: "Pending",
          },
        },
      ],
      pageNumber: "1",
      totalNumberOfPages: 1,
      totalNumberOfRecords: 3,
    });

    Account.getUsersById.mockReset().mockReturnValue([
      {
        claims: {
          sub: "user-id-1",
          given_name: "User",
          family_name: "One",
          email: "user.one@unit.tests",
        },
      },
      {
        claims: {
          sub: "user-id-2",
          given_name: "User",
          family_name: "Two",
          email: "user.two@unit.tests",
        },
      },
    ]);

    const {
      get,
      post,
    } = require("../../../../src/app/accessRequests/getAllRequestsForApproval");

    getAllRequestsForApproval = get;
    postAllRequestsForApproval = post;
  });

  it("then it should get all the access requests (organisation, service, sub-service) for all organisations where the logged-in user is Approver", async () => {
    await getAllRequestsForApproval(req, res);
    expect(getAllRequestTypesForApproverRaw.mock.calls).toHaveLength(1);
    expect(getAllRequestTypesForApproverRaw.mock.calls[0][0]).toMatchObject({
      pageNumber: 1,
      pageSize: 5,
      userId: "user1",
    });
  });

  it("then it should return the `getAllRequestsForApproval` view", async () => {
    await getAllRequestsForApproval(req, res);

    expect(res.render.mock.calls.length).toBe(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/allRequestsForApproval",
    );
  });

  it("then it should include the correct page title", async () => {
    await getAllRequestsForApproval(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      title: "Requests",
    });
  });

  it("then it should include the correct navigation", async () => {
    await getAllRequestsForApproval(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      currentPage: "requests",
    });
  });

  it("then it should include the mapped request with users details", async () => {
    await getAllRequestsForApproval(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({
      requests: [
        {
          created_date: "2023-05-10T12:00:35.169Z",
          id: "org-req-id-1",
          org_id: "org-id-1",
          org_name: "Department for Education",
          request_type: {
            id: "organisation",
            name: "Organisation access",
          },
          status: {
            id: 0,
            name: "Pending",
          },
          userName: "User One",
          user_id: "user-id-1",
          usersEmail: "user.one@unit.tests",
        },
        {
          id: "service-req-id-1",
          org_id: "org-id-1",
          org_name: "Department for Education",
          user_id: "user-id-2",
          created_date: "2023-05-09T14:36:15.387Z",
          request_type: {
            id: "service",
            name: "Service access",
          },
          status: {
            id: 0,
            name: "Pending",
          },
          userName: "User Two",
          usersEmail: "user.two@unit.tests",
        },
        {
          id: "sub-service-req-id-1",
          org_id: "org-id-1",
          org_name: "Department for Education",
          user_id: "user-id-2",
          created_date: "2023-04-24T16:22:14.704Z",
          request_type: {
            id: "subService",
            name: "Sub-service access",
          },
          status: {
            id: 0,
            name: "Pending",
          },
          userName: "User Two",
          usersEmail: "user.two@unit.tests",
        },
      ],
    });
  });

  it("then it should include the csrfToken", async () => {
    await getAllRequestsForApproval(req, res);

    expect(res.render.mock.calls[0][1]).toMatchObject({ csrfToken: "token" });
  });

  it("then it should include the page number of requests", async () => {
    await getAllRequestsForApproval(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({ page: 1 });
  });

  it("then it should include total number of pages of requests", async () => {
    await getAllRequestsForApproval(req, res);
    expect(res.render.mock.calls[0][1]).toMatchObject({ numberOfPages: 1 });
  });

  it("then it should redirect to the correct page number when navigating trough the paginated requests", async () => {
    req.method = "POST";
    req.body.page = 2;

    await postAllRequestsForApproval(req, res);
    expect(res.redirect.mock.calls.length).toEqual(1);
    expect(res.redirect.mock.calls[0][0]).toEqual("?page=2");
  });

  it("then it should redirect to first page of requests if the pageNumber is not a number", async () => {
    req.query.page = "test";

    await getAllRequestsForApproval(req, res);
    expect(getAllRequestTypesForApproverRaw.mock.calls[0][0]).toMatchObject({
      pageNumber: 1,
      pageSize: 5,
      userId: "user1",
    });
    expect(res.render.mock.calls[0][1]).toMatchObject({ page: 1 });
  });
});
