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
jest.mock("./../../../../src/app/users/utils");
jest.mock("./../../../../src/infrastructure/organisations");
jest.mock("login.dfe.jobs-client");
jest.mock("login.dfe.api-client/users", () => {
  return {
    searchUserByIdRaw: jest.fn(),
    updateUserDetailsInSearchIndex: jest.fn(),
  };
});

const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");
const {
  post,
} = require("./../../../../src/app/accessRequests/reviewOrganisationRequest");
const res = mockResponse();
const {
  putUserInOrganisation,
  updateRequestById,
  getOrganisationById,
} = require("./../../../../src/infrastructure/organisations");
const {
  searchUserByIdRaw,
  updateUserDetailsInSearchIndex,
} = require("login.dfe.api-client/users");
const {
  getAndMapOrgRequest,
} = require("./../../../../src/app/accessRequests/utils");
const logger = require("./../../../../src/infrastructure/logger");

const { NotificationClient } = require("login.dfe.jobs-client");
const sendAccessRequest = jest.fn();
const sendOrganisationRequestOutcomeToApprovers = jest.fn();
NotificationClient.mockImplementation(() => {
  return {
    sendOrganisationRequestOutcomeToApprovers,
    sendAccessRequest,
  };
});

Date.now = jest.fn(() => "2019-01-02");

describe("when reviewing an organisation request", () => {
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
        selectedResponse: "approve",
      },
    });

    putUserInOrganisation.mockReset();
    updateRequestById.mockReset();

    sendAccessRequest.mockReset();
    sendOrganisationRequestOutcomeToApprovers.mockReset();
    NotificationClient.mockImplementation(() => {
      return {
        sendAccessRequest,
        sendOrganisationRequestOutcomeToApprovers,
      };
    });
    getOrganisationById.mockReset().mockReturnValue({
      id: "org1",
      name: "organisation two",
      category: {
        id: "001",
        name: "Establishment",
      },
      status: {
        id: 1,
      },
    });
    searchUserByIdRaw.mockReset();
    searchUserByIdRaw.mockReturnValue({
      organisations: [],
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

  it("then it should render error if no response selected", async () => {
    req.body.selectedResponse = null;
    req.params.rid = 1;

    await post(req, res);

    expect(putUserInOrganisation.mock.calls).toHaveLength(0);
    expect(updateRequestById.mock.calls).toHaveLength(0);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/reviewOrganisationRequest",
    );
    expect(res.render.mock.calls[0][1]).toEqual({
      backLink: "/access-requests/requests",
      cancelLink: "/access-requests/requests",
      csrfToken: "token",
      currentPage: "requests",
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
      selectedResponse: null,
      title: "Review request - DfE Sign-in",
      validationMessages: {
        selectedResponse: "Approve or Reject must be selected",
      },
    });
  });

  it("then it should render error if request already actioned", async () => {
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

    await post(req, res);

    expect(putUserInOrganisation.mock.calls).toHaveLength(0);
    expect(updateRequestById.mock.calls).toHaveLength(0);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "accessRequests/views/reviewOrganisationRequest",
    );
    expect(res.render.mock.calls[0][1]).toEqual({
      backLink: "/access-requests/requests",
      cancelLink: "/access-requests/requests",
      csrfToken: "token",
      currentPage: "requests",
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
      selectedResponse: "approve",
      title: "Review request - DfE Sign-in",
      validationMessages: {
        selectedResponse: "Request already actioned by jane.doe@email.com",
      },
    });
  });

  it("then it should redirect to rejection reason if reject", async () => {
    req.body.selectedResponse = "reject";

    await post(req, res);

    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("requestId/rejected");
  });

  it("then it should put the user in the organisation if approved", async () => {
    await post(req, res);

    expect(putUserInOrganisation.mock.calls).toHaveLength(1);
    expect(putUserInOrganisation.mock.calls[0][0]).toBe("userId");
    expect(putUserInOrganisation.mock.calls[0][1]).toBe("org1");
    expect(putUserInOrganisation.mock.calls[0][2]).toBe(0);
    expect(putUserInOrganisation.mock.calls[0][3]).toBe(null);
    expect(putUserInOrganisation.mock.calls[0][4]).toBe("correlationId");
  });

  it("then it should patch the request as complete", async () => {
    await post(req, res);

    expect(updateRequestById.mock.calls).toHaveLength(1);
    expect(updateRequestById.mock.calls[0][0]).toBe("requestId");
    expect(updateRequestById.mock.calls[0][1]).toBe(1);
    expect(updateRequestById.mock.calls[0][2]).toBe("user1");
    expect(updateRequestById.mock.calls[0][3]).toBe(null);
    expect(updateRequestById.mock.calls[0][4]).toBe("2019-01-02");
    expect(updateRequestById.mock.calls[0][5]).toBe("correlationId");
  });

  it("then it should update the search index with the new org and redirect", async () => {
    await post(req, res);
    expect(updateUserDetailsInSearchIndex).toHaveBeenCalledTimes(1);
    expect(updateUserDetailsInSearchIndex).toHaveBeenLastCalledWith({
      userId: "userId",
      organisations: [
        {
          categoryId: "001",
          establishmentNumber: undefined,
          id: "org1",
          laNumber: undefined,
          name: "organisation two",
          roleId: 0,
          statusId: 1,
          uid: undefined,
          urn: undefined,
        },
      ],
    });
    //expect(NotificationClient.sendAccessRequest.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls).toHaveLength(1);
    expect(res.redirect.mock.calls[0][0]).toBe("/access-requests/requests");
  });

  it("then it should should send notification emails and audit approved org request", async () => {
    await post(req, res);

    //expect(sendOrganisationRequestOutcomeToApprovers.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      "email@email.com (id: user1) approved organisation request for org1)",
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      type: "approver",
      subType: "approved-org",
      userId: "user1",
      meta: {
        editedUser: "userId",
        editedFields: [
          {
            name: "new_organisation",
            newValue: "org1",
            oldValue: undefined,
          },
        ],
      },
    });
  });

  it("should log an error and not update search index or send an email if the user is not found", async () => {
    searchUserByIdRaw.mockReturnValue(null);
    await post(req, res);

    expect(updateUserDetailsInSearchIndex.mock.calls).toHaveLength(0);
    expect(sendAccessRequest.mock.calls).toHaveLength(0);
    expect(sendOrganisationRequestOutcomeToApprovers.mock.calls).toHaveLength(
      0,
    );

    expect(logger.error.mock.calls).toHaveLength(1);
    expect(logger.error.mock.calls[0][0]).toBe(
      "Failed to find user userId when confirming change of organisations",
    );
    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      "email@email.com (id: user1) approved organisation request for org1)",
    );
  });

  it("should log an error and not update search index or send an email if the organisation is not found", async () => {
    getOrganisationById.mockReturnValue(null);
    await post(req, res);

    expect(updateUserDetailsInSearchIndex.mock.calls).toHaveLength(0);
    expect(sendAccessRequest.mock.calls).toHaveLength(0);
    expect(sendOrganisationRequestOutcomeToApprovers.mock.calls).toHaveLength(
      0,
    );
    expect(logger.error.mock.calls).toHaveLength(1);
    expect(logger.error.mock.calls[0][0]).toBe(
      "Failed to find organisation org1 when confirming change of organisations",
    );
    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      "email@email.com (id: user1) approved organisation request for org1)",
    );
  });
});
