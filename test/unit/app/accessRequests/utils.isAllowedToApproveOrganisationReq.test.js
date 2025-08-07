const { mockRequest } = require("../../../utils/jestMocks");
jest.mock("../../../../src/infrastructure/organisations");
jest.mock("../../../../src/infrastructure/account", () => ({
  getById: jest.fn(),
}));
jest.mock("login.dfe.dao", () => ({
  services: {
    getUserServiceRequest: jest.fn(),
  },
}));

const {
  getRequestById,
} = require("../../../../src/infrastructure/organisations");
const {
  isAllowedToApproveOrganisationReq,
} = require("../../../../src/app/accessRequests/utils");

let req;
let res;
let next;

describe("utils.getAndMapServiceRequest function", () => {
  beforeEach(() => {
    // Removed a number of fields from userOrganisations for brevity
    const userOrganisations = [
      {
        organisation: {
          id: "org-1",
          name: "12 Training",
          ukprn: "10023277",
        },
        role: {
          id: 10000,
          name: "Approver",
        },
        approvers: [
          {
            dataValues: {
              user_id: "user-1",
              organisation_id: "org-1",
              role_id: 10000,
              status: 0,
              reason: null,
            },
          },
        ],
        services: [],
        numericIdentifier: "74696",
        textIdentifier: "37k6k4d",
      },
      {
        organisation: {
          id: "org-2",
          name: "Abbey School",
          ukprn: "10056212",
        },
        role: {
          id: 0,
          name: "End user",
        },
        approvers: [
          {
            dataValues: {
              user_id: "user-2",
              organisation_id: "org-2",
              role_id: 10000,
              status: 1,
              reason: "d8626378-79cd-4b21-b870-82c7f15e7a62",
            },
          },
        ],
        services: [
          {
            id: "6EADBBC8-4FB7-4021-9AE2-4270E8805596",
            externalIdentifiers: [],
            requestDate: "2025-05-07T09:31:24.743Z",
            status: 1,
          },
        ],
        numericIdentifier: "73834",
        textIdentifier: "3k7k9dd",
      },
    ];

    req = mockRequest({
      userOrganisations,
      params: {
        rid: "org-req-1",
      },
      session: {
        user: { sub: "user1", email: "email@email.com" },
      },
      user: {
        sub: "user1",
        email: "email@email.com",
      },
    });

    res = {
      status: jest.fn().mockReturnThis(),
      render: jest.fn(),
    };
    next = jest.fn();

    getRequestById.mockReset().mockReturnValue({
      usersName: "John Doe",
      usersEmail: "john.doe@email.com",
      id: "org-req-1",
      org_id: "org-1",
      organisation_id: "org-1",
      org_name: "Org 1",
      user_id: "userId",
      created_date: "2025-05-01",
      actioned_date: null,
      actioned_by: null,
      actioned_reason: null,
      reason: "",
      status: {
        id: 0,
        name: "Pending",
      },
    });
  });

  it("should invoke the next function if the user is an approver", async () => {
    await isAllowedToApproveOrganisationReq(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledTimes(0);
  });

  it("should invoke the next function if the user is NOT an approver", async () => {
    // User is an 'end user' for org-2
    getRequestById.mockReset().mockReturnValue({
      usersName: "John Doe",
      usersEmail: "john.doe@email.com",
      id: "org-req-1",
      org_id: "org-2",
      organisation_id: "org-2",
      org_name: "Org 1",
      user_id: "userId",
      created_date: "2025-05-01",
      actioned_date: null,
      actioned_by: null,
      actioned_reason: null,
      reason: "",
      status: {
        id: 0,
        name: "Pending",
      },
    });
    await isAllowedToApproveOrganisationReq(req, res, next);
    expect(next).toHaveBeenCalledTimes(0);
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.render).toHaveBeenCalledWith("errors/views/notAuthorised");
  });
});
