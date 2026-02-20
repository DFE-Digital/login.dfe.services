const {
  getAllRequestTypesForApproverRaw,
} = require("login.dfe.api-client/services");
const {
  getUserDetails,
  getMappedRequestServiceWithSubServices,
} = require("./utils");
const { dateFormat } = require("../helpers/dateFormatterHelper");
const {
  generateRequestSummary,
} = require("../helpers/generateRequestSummaryHelper");

const getAllRequestsForApproval = async (req) => {
  const pageSize = 5;
  const paramsSource =
    req.method.toUpperCase() === "POST" ? req.body : req.query;
  const pageNumber = parseInt(paramsSource.page, 10) || 1;

  const allRequestsForApprover = await getAllRequestTypesForApproverRaw({
    userId: req.user.sub,
    pageNumber,
    pageSize,
  });

  let { requests } = allRequestsForApprover;

  if (requests) {
    const userList = (await getUserDetails(requests)) || [];

    // First map: enrich with user details
    requests = requests.map((request) => {
      const userFound = userList.find(
        (c) => c.claims.sub.toLowerCase() === request.user_id.toLowerCase(),
      );
      const usersEmail = userFound ? userFound.claims.email : "";
      const userName = userFound
        ? `${userFound.claims.given_name} ${userFound.claims.family_name}`
        : "";
      const formattedCreatedDate = request.created_date
        ? dateFormat(request.created_date, "shortDateFormat")
        : "";

      return {
        ...request,
        usersEmail,
        userName,
        formattedCreatedDate,
      };
    });

    // Second map: enrich with service and sub-service (role) details
    requests = await Promise.all(
      requests.map(async (request) => {
        if (
          request?.request_type?.name?.toLowerCase() !== "organisation access"
        ) {
          return await getMappedRequestServiceWithSubServices(request);
        }
        return request;
      }),
    );

    // Third map: add summary using helper
    requests = requests.map((request, index) => ({
      ...request,
      summary: generateRequestSummary(request, index),
    }));
  }

  return {
    csrfToken: req.csrfToken(),
    title: "Requests",
    currentPage: "requests",
    requests,
    pageNumber,
    numberOfPages: allRequestsForApprover.totalNumberOfPages,
    totalNumberOfResults: allRequestsForApprover.totalNumberOfRecords,
  };
};

const buildModel = async (req) => {
  const pagedRequests = await getAllRequestsForApproval(req);
  return {
    csrfToken: req.csrfToken(),
    title: "Requests",
    currentPage: "requests",
    requests: pagedRequests.requests,
    page: pagedRequests.pageNumber,
    numberOfPages: pagedRequests.numberOfPages,
    totalNumberOfResults: pagedRequests.totalNumberOfResults,
  };
};

const get = async (req, res) => {
  if (req.session.roles !== undefined) {
    req.session.roles = undefined;
  }
  if (req.session.roleIds !== undefined) {
    req.session.roleIds = undefined;
  }
  const model = await buildModel(req);
  return res.render("accessRequests/views/allRequestsForApproval", model);
};

const post = async (req, res) => {
  const model = await buildModel(req);
  return res.redirect(`?page=${model.page}`);
};

module.exports = {
  get,
  post,
};
