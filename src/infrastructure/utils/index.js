const config = require("./../config");
const {
  getOrganisationAndServiceForUserV2,
  getPendingRequestsAssociatedWithUser,
} = require("./../organisations");

const {
  getServiceRequestsForApproverRaw,
} = require("login.dfe.api-client/services");

const {
  getPendingOrganisationRequestsRaw,
} = require("login.dfe.api-client/users");

const isLoggedIn = (req, res, next) => {
  if (
    req.isAuthenticated() ||
    req.originalUrl.startsWith("/signout?redirected=true")
  ) {
    res.locals.isLoggedIn = true;
    return next();
  }
  req.session.redirectUrl = req.originalUrl;
  return res.status(302).redirect("/auth");
};

const canRequestOrg = async (req, res, next) => {
  if (
    req.userOrganisations.length === 0 &&
    (await getPendingRequestsAssociatedWithUser(req.user.id)).length > 0
  ) {
    res.flash("title", "Important");
    res.flash(
      "heading",
      "Your recent organisation request is awaiting approval.",
    );
    res.flash(
      "message",
      "You must wait for a response before submitting another request.",
    );
    return res.sessionRedirect("/organisations");
  }
  return next();
};

const addSessionRedirect = (errorPageRenderer, logger = console) => {
  if (typeof errorPageRenderer !== "function") {
    throw new Error("addSessionRedirect errorPageRenderer must be a function");
  }

  if (typeof logger.error !== "function") {
    throw new Error("addSessionRedirect logger must have an error method");
  }

  return (req, res, next) => {
    res.sessionRedirect = (redirectLocation) => {
      if (typeof redirectLocation !== "string") {
        throw new Error("sessionRedirect redirect location must be a string");
      }

      req.session.save((error) => {
        if (error) {
          const initialError = error instanceof Error ? error.message : error;
          const errorMessage = `Error saving session for request ${req.method} ${req.originalUrl}: ${initialError}`;
          logger.error(errorMessage, {
            correlationId: req.id,
            stack:
              error instanceof Error
                ? (error.stack ?? "No stack trace provided on Error object")
                : "No stack trace available as error is not an Error instance",
          });
          const { content, contentType } = errorPageRenderer(errorMessage);
          return res.status(500).contentType(contentType).send(content);
        } else {
          res.redirect(redirectLocation);
        }
      });
    };

    return next();
  };
};

const isApprover = (req, res, next) => {
  if (req.userOrganisations) {
    const userApproverOrgs = req.userOrganisations.filter(
      (x) => x.role.id === 10000,
    );
    if (
      userApproverOrgs.find(
        (x) =>
          x.organisation.id.toLowerCase() === req.params.orgId.toLowerCase(),
      )
    ) {
      return next();
    }
  }
  return res.status(401).render("errors/views/notAuthorised");
};

const isApproverInSomeOrgs = (req, res, next) => {
  if (req.userOrganisations) {
    const userApproverOrgs = req.userOrganisations.filter(
      (x) => x.role.id === 10000,
    );
    if (userApproverOrgs.length > 0) {
      return next();
    }
  }
  return res.status(401).render("errors/views/notAuthorised");
};

const isSelfRequest = (req, res, next) => {
  if (req.user && req.user.sub === req.params.uid) {
    return next();
  }
  return res.status(401).render("errors/views/notAuthorised");
};

const getUserEmail = (user) => user.email || "";

const getUserDisplayName = (user) =>
  `${user.given_name || ""} ${user.family_name || ""}`.trim();

const setUserContext = async (req, res, next) => {
  if (req.user) {
    res.locals.user = req.user;
    res.locals.displayName = getUserDisplayName(req.user);
    const organisations = await getOrganisationAndServiceForUserV2(
      req.user.sub,
    );
    req.userOrganisations = organisations;
    try {
      if (req.userOrganisations) {
        res.locals.isApprover =
          req.userOrganisations.filter((x) => x.role.id === 10000).length > 0;
      }
      if (res.locals.isApprover) {
        const approverOrgRequests = await getPendingOrganisationRequestsRaw({
          userId: req.user.sub,
        });
        const { totalNumberOfRecords } = await getServiceRequestsForApproverRaw(
          { userId: req.user.sub },
        );
        req.organisationRequests = approverOrgRequests;
        res.locals.approverRequests = approverOrgRequests;
        res.locals.totalNumberOfAccessRequests = totalNumberOfRecords;
      }
    } catch (e) {
      return e;
    }
  }
  next();
};

const asyncMiddleware = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const setConfigContext = (req, res, next) => {
  res.locals.profilesUrl = config.hostingEnvironment.profileUrl;
  next();
};

// Note: Any changes to user statuses here require corresponding
// updates in login.dfe.manage (src/infrastructure/utils/index.js)
// as functionality is duplicated. Ensure consistency across both implementations.
const userStatusMap = [
  { id: -2, name: "Deactivated Invitation", tagColor: "orange" },
  { id: -1, name: "Invited", tagColor: "blue" },
  { id: 0, name: "Deactivated", tagColor: "red" },
  { id: 1, name: "Active", tagColor: "green" },
];

const mapUserStatus = (statusId, changedOn = null) => {
  const statusObj = userStatusMap.find((s) => s.id === statusId);
  if (!statusObj) {
    return {
      id: statusId,
      description: "Unknown",
      tagColor: "grey",
      changedOn,
    };
  }
  return {
    id: statusObj.id,
    description: statusObj.name,
    tagColor: statusObj.tagColor,
    changedOn,
  };
};

const mapRole = (roleId) => {
  if (roleId === 10000) {
    return { id: 10000, description: "Approver" };
  }
  return { id: 0, description: "End user" };
};

module.exports = {
  isLoggedIn,
  canRequestOrg,
  addSessionRedirect,
  getUserEmail,
  getUserDisplayName,
  setUserContext,
  asyncMiddleware,
  setConfigContext,
  isApprover,
  isApproverInSomeOrgs,
  mapUserStatus,
  isSelfRequest,
  mapRole,
};
