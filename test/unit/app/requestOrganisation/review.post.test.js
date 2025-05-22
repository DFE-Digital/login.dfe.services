jest.mock("./../../../../src/infrastructure/config", () =>
  require("./../../../utils/jestMocks").mockConfig(),
);
jest.mock("./../../../../src/infrastructure/logger", () =>
  require("./../../../utils/jestMocks").mockLogger(),
);

jest.mock("./../../../../src/infrastructure/organisations");
jest.mock("login.dfe.jobs-client");

const { mockRequest, mockResponse } = require("./../../../utils/jestMocks");
const { post } = require("./../../../../src/app/requestOrganisation/review");
const res = mockResponse();
const {
  createUserOrganisationRequest,
  getOrganisationById,
  getRequestsForOrganisation,
  getPendingRequestsAssociatedWithUser,
  getApproversForOrganisation,
} = require("./../../../../src/infrastructure/organisations");
const logger = require("./../../../../src/infrastructure/logger");

const { NotificationClient } = require("login.dfe.jobs-client");
const sendUserOrganisationRequest = jest.fn();
NotificationClient.mockImplementation(() => {
  return {
    sendUserOrganisationRequest,
  };
});
const createString = (length) => {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
  let str = "";
  for (let i = 0; i < length; i += 1) {
    str = str + charset[Math.random() * charset.length];
  }
  return str;
};

describe("when reviewing an organisation request", () => {
  let req;

  beforeEach(() => {
    req = mockRequest({
      user: {
        sub: "user1",
        email: "email@email.com",
      },
      session: {
        organisationId: "org1",
      },
      body: {
        organisationId: "org1",
        organisationName: "org name",
        reason: "reason",
      },
    });
    createUserOrganisationRequest.mockReset().mockReturnValue("requestId");

    sendUserOrganisationRequest.mockReset();
    NotificationClient.mockImplementation(() => {
      return {
        sendUserOrganisationRequest,
      };
    });
    getOrganisationById.mockReset().mockReturnValue({
      id: "org1",
      name: "organisation two",
      category: {
        id: "001",
        name: "Establishment",
      },
    });
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
    getPendingRequestsAssociatedWithUser.mockReset();
    getApproversForOrganisation.mockReturnValue(["111", "222"]);
    getPendingRequestsAssociatedWithUser.mockReturnValue([
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
    res.mockResetAll();
  });

  it("should render error view if a reason isn't provided", async () => {
    req.body.reason = createString(0);

    await post(req, res);

    expect(sendUserOrganisationRequest.mock.calls).toHaveLength(0);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestOrganisation/views/review",
    );
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: "token",
      currentPage: "organisations",
      organisation: {
        id: "org1",
        name: "organisation two",
        category: {
          id: "001",
          name: "Establishment",
        },
      },
      reason: req.body.reason,
      title: "Confirm Request - DfE Sign-in",
      validationMessages: {
        reason: "Enter a reason for request",
      },
      backLink: "/request-organisation/search",
    });
  });

  it("then it should render error view if reason is too long", async () => {
    req.body.reason = createString(1001);

    await post(req, res);

    expect(sendUserOrganisationRequest.mock.calls).toHaveLength(0);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestOrganisation/views/review",
    );
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: "token",
      currentPage: "organisations",
      organisation: {
        id: "org1",
        name: "organisation two",
        category: {
          id: "001",
          name: "Establishment",
        },
      },
      reason: req.body.reason,
      title: "Confirm Request - DfE Sign-in",
      validationMessages: {
        reason: "Reason cannot be longer than 200 characters",
      },
      backLink: "/request-organisation/search",
    });
  });

  it("then it should render error view if org requests are over limit", async () => {
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
      {
        id: "request2",
        org_id: "organisationId",
        org_name: "organisationName",
        user_id: "user2",
        status: {
          id: 0,
          name: "pending",
        },
        created_date: "2019-08-12",
      },
      {
        id: "request3",
        org_id: "organisationId",
        org_name: "organisationName",
        user_id: "user2",
        status: {
          id: 0,
          name: "pending",
        },
        created_date: "2019-08-12",
      },
      {
        id: "request4",
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
    await post(req, res);
    expect(sendUserOrganisationRequest.mock.calls).toHaveLength(0);
    expect(res.render.mock.calls).toHaveLength(1);
    expect(res.render.mock.calls[0][0]).toBe(
      "requestOrganisation/views/review",
    );
    expect(res.render.mock.calls[0][1]).toEqual({
      csrfToken: "token",
      currentPage: "organisations",
      organisation: {
        id: "org1",
        name: "organisation two",
        category: {
          id: "001",
          name: "Establishment",
        },
      },
      reason: req.body.reason,
      title: "Confirm Request - DfE Sign-in",
      validationMessages: {
        limitOrg: "Organisation has reached the limit for requests",
        limit:
          "A current request needs to be actioned before new requests can be made",
      },
      backLink: "/request-organisation/search",
    });
  });

  it("then it should create the organisation request", async () => {
    await post(req, res);

    expect(createUserOrganisationRequest.mock.calls).toHaveLength(1);
    expect(createUserOrganisationRequest.mock.calls[0][0]).toBe("user1");
    expect(createUserOrganisationRequest.mock.calls[0][1]).toBe("org1");
    expect(createUserOrganisationRequest.mock.calls[0][2]).toBe("reason");
    expect(createUserOrganisationRequest.mock.calls[0][3]).toBe(
      "correlationId",
    );
  });

  it("then it should should audit org request", async () => {
    await post(req, res);

    expect(logger.audit.mock.calls).toHaveLength(1);
    expect(logger.audit.mock.calls[0][0].message).toBe(
      "email@email.com (id: user1) requested organisation (id: org1)",
    );
    expect(logger.audit.mock.calls[0][0]).toMatchObject({
      type: "organisation",
      subType: "access-request",
      organisationid: "org1",
      userEmail: "email@email.com",
      userId: "user1",
    });
  });

  it("then it should redirect to organisations", async () => {
    await post(req, res);

    expect(res.sessionRedirect.mock.calls).toHaveLength(1);
    expect(res.sessionRedirect.mock.calls[0][0]).toBe(`/organisations`);
  });
});
