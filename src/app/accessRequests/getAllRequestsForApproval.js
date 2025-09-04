const {
  getAllRequestTypesForApproverRaw,
} = require("login.dfe.api-client/services");
const { getUserDetails } = require("./utils");
const { dateFormat } = require("../helpers/dateFormatterHelper");

const getAllRequestsForApproval = async (req) => {
  const pageSize = 5;
  const paramsSource =
    req.method.toUpperCase() === "POST" ? req.body : req.query;
  let pageNumber = parseInt(paramsSource.page, 10) || 1;
  if (isNaN(pageNumber)) {
    pageNumber = 1;
  }
  const allRequestsForApprover = await getAllRequestTypesForApproverRaw({
    userId: req.user.sub,
    pageNumber,
    pageSize,
  });
  let { requests } = allRequestsForApprover;
  if (requests) {
    const userList = (await getUserDetails(requests)) || [];

    requests = requests.map((user) => {
      const userFound = userList.find(
        (c) => c.claims.sub.toLowerCase() === user.user_id.toLowerCase(),
      );
      const usersEmail = userFound ? userFound.claims.email : "";
      const userName = userFound
        ? `${userFound.claims.given_name} ${userFound.claims.family_name}`
        : "";
      const formattedCreatedDate = user.created_date
        ? dateFormat(user.created_date, "shortDateFormat")
        : "";
      return Object.assign(
        { usersEmail, userName, formattedCreatedDate },
        user,
      );
    });
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
