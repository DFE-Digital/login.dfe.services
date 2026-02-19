jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);
jest.mock("login.dfe.dao", () =>
  require("./../../../utils/jestMocks").mockDao(),
);
jest.mock("./../../../../src/app/accessRequests/utils");
jest.mock("./../../../../src/infrastructure/organisations");
jest.mock("login.dfe.jobs-client");

const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");
const {
  post,
} = require("./../../../../src/app/accessRequests/rejectOrganisationRequest");
const res = mockResponse();
const {
  updateRequestById,
} = require("./../../../../src/infrastructure/organisations");
const {
  getAndMapOrgRequest,
} = require("./../../../../src/app/accessRequests/utils");
const logger = require("./../../../../src/infrastructure/logger");

const { NotificationClient } = require("login.dfe.jobs-client");
const sendAccessRequest = jest.fn();
const sendOrganisationRequestOutcomeToApprovers = jest.fn();

Date.now = jest.fn(() => "2019-01-02");

const createString = (length) => {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
  let str = "";
  for (let i = 0; i < length; i += 1) {
    str = str + charset[Math.random() * charset.length];
  }
  return str;
};

describe("when rejecting an organisation request", () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      user: {
        sub: "user1",
        email: "email@email.com",
      },
      params: {
        orgId: "org1",
      },
      body: {
        reason: "reason for rejection",
      },
    });
    updateRequestById.mockReset();

    sendAccessRequest.mockReset();
    sendOrganisationRequestOutcomeToApprovers.mockReset();
    NotificationClient.mockImplementation(() => {
      return {
        sendAccessRequest,
        sendOrganisationRequestOutcomeToApprovers,
      };
    });
    getAndMapOrgRequest.mockReset().mockReturnValue({
      usersName: "John Doe",
      usersEmail: "john.doe@email.com",
      id: "requestId",
      org_id: "org1",
      org_name: "Org 1",
      user_id: "userId",
      created_date: "2019-05-01",
      actioned_date: null,
      actioned_by: null,
      actioned_reason: null,
      reason: "",
      status: {
        id: 0,
        name: "Pending",
      },
    });

    res.mockResetAll();
  });

  it("then it should render error if request has been actioned", async () => {
    getAndMapOrgRequest.mockReset().mockReturnValue({
      usersName: "John Doe",
      usersEmail: "john.doe@email.com",
      approverName: "Jane Doe",
      approverEmail: "jane.doe@email.com",
      id: "requestId",
      org_id: "org1",
      org_name: "Org 1",
      user_id: "userId",
      created_date: "2019-05-01",
      actioned_date: null,
      actioned_by: null,
      actioned_reason: null,
      reason: "",
      status: {
        id: 1,
        name: "approved",
      },
    });
    req.params.rid = 1;

    await post(req, res);

    expect(updateRequestById.mock.calls).toHaveLength(0);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/rejectOrganisationRequest",
    );
    expect(res.render.mock.calls[0][1]).toEqual({
      backLink: "/access-requests/organisation-requests/1",
      cancelLink: "/access-requests/requests",
      csrfToken: "token",
      request: {
        actioned_by: null,
        actioned_date: null,
        actioned_reason: null,
        created_date: "2019-05-01",
        id: "requestId",
        org_id: "org1",
        org_name: "Org 1",
        reason: "",
        status: {
          id: 1,
          name: "approved",
        },
        user_id: "userId",
        usersEmail: "john.doe@email.com",
        usersName: "John Doe",
        approverName: "Jane Doe",
        approverEmail: "jane.doe@email.com",
      },
      reason: "reason for rejection",
      title: "Reason for rejection",
      validationMessages: {
        reason: "Request already actioned by jane.doe@email.com",
      },
    });
  });

  it("then it should render error view if rejection reason is to long", async () => {
    req.body.reason = createString(1001);
    req.params.rid = 1;

    await post(req, res);

    expect(updateRequestById.mock.calls).toHaveLength(0);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/rejectOrganisationRequest",
    );
    expect(res.render.mock.calls[0][1]).toEqual({
      backLink: "/access-requests/organisation-requests/1",
      cancelLink: "/access-requests/requests",
      csrfToken: "token",
      request: {
        actioned_by: null,
        actioned_date: null,
        actioned_reason: null,
        created_date: "2019-05-01",
        id: "requestId",
        org_id: "org1",
        org_name: "Org 1",
        reason: "",
        status: {
          id: 0,
          name: "Pending",
        },
        user_id: "userId",
        usersEmail: "john.doe@email.com",
        usersName: "John Doe",
      },
      reason: req.body.reason,
      title: "Reason for rejection",
      validationMessages: {
        reason: "Reason cannot be longer than 1000 characters",
      },
    });
  });

  it("then it should patch the request as rejected and send relevant emails", async () => {
    await post(req, res);

    expect(updateRequestById.mock.calls).toHaveLength(1);
    expect(updateRequestById.mock.calls[0][0]).toBe("requestId");
    expect(updateRequestById.mock.calls[0][1]).toBe(-1);
    expect(updateRequestById.mock.calls[0][2]).toBe("user1");
    expect(updateRequestById.mock.calls[0][3]).toBe("reason for rejection");
    expect(updateRequestById.mock.calls[0][4]).toBe("2019-01-02");
    expect(updateRequestById.mock.calls[0][5]).toBe("correlationId");

    expect(sendAccessRequest.mock.calls).toHaveLength(1);
    expect(sendAccessRequest.mock.calls[0][0]).toBe("john.doe@email.com");
    expect(sendAccessRequest.mock.calls[0][1]).toBe("John Doe");
    expect(sendAccessRequest.mock.calls[0][2]).toBe("Org 1");
    expect(sendAccessRequest.mock.calls[0][3]).toBe(false);
    expect(sendAccessRequest.mock.calls[0][4]).toBe("reason for rejection");

    expect(sendOrganisationRequestOutcomeToApprovers.mock.calls).toHaveLength(
      1,
    );
    expect(sendOrganisationRequestOutcomeToApprovers.mock.calls[0][0]).toBe(
      "user1",
    );
    expect(sendOrganisationRequestOutcomeToApprovers.mock.calls[0][1]).toBe(
      "john.doe@email.com",
    );
    expect(sendOrganisationRequestOutcomeToApprovers.mock.calls[0][2]).toBe(
      "John Doe",
    );
    expect(sendOrganisationRequestOutcomeToApprovers.mock.calls[0][3]).toBe(
      undefined,
    );
    expect(sendOrganisationRequestOutcomeToApprovers.mock.calls[0][4]).toBe(
      "Org 1",
    );
    expect(sendOrganisationRequestOutcomeToApprovers.mock.calls[0][5]).toBe(
      false,
    );
    expect(sendOrganisationRequestOutcomeToApprovers.mock.calls[0][6]).toBe(
      "reason for rejection",
    );
  });

  it("then it should should audit rejected org request", async () => {
    await post(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      "email@email.com rejected organisation request for john.doe@email.com",
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      type: "approver",
      subType: "organisation-request-rejected",
      userId: "user1",
      editedUser: "userId",
      reason: "reason for rejection",
    });
  });

  it("then it should redirect to the requests view", async () => {
    await post(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/access-requests/requests");
  });
});
