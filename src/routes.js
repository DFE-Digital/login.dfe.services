const passport = require("passport");
const logger = require("./infrastructure/logger");
const config = require("./infrastructure/config");

const home = require("./app/home");
const accessRequests = require("./app/accessRequests");
const signOut = require("./app/signOut");
const healthCheck = require("login.dfe.healthcheck");
const organisations = require("./app/organisations");
const users = require("./app/users");
const requestOrganisation = require("./app/requestOrganisation");
const version = require("../package.json").version;
const requestService = require("./app/requestService");

const routes = (app, csrf) => {
  // auth callbacks
  app.get("/auth", passport.authenticate("oidc"));
  app.get("/auth/cb", (req, res, next) => {
    const defaultLoggedInPath = "/my-services";

    if (req.query.error === "sessionexpired") {
      return res.redirect(defaultLoggedInPath);
    }
    passport.authenticate("oidc", (err, user) => {
      let redirectUrl = defaultLoggedInPath;

      if (err) {
        if (err.message.match(/state\smismatch/)) {
          req.session = null;
          return res.redirect(defaultLoggedInPath);
        }
        logger.error(`Error in auth callback - ${err}`);
        return next(err);
      }
      if (!user) {
        return res.redirect("/");
      }

      if (req.session.redirectUrl) {
        redirectUrl = req.session.redirectUrl;
        req.session.redirectUrl = null;
      }

      return req.logIn(user, (loginErr) => {
        if (loginErr) {
          logger.error(`Login error in auth callback - ${loginErr}`);
          return next(loginErr);
        }
        if (redirectUrl.endsWith("signout/complete")) redirectUrl = "/";
        if (!req.session.user) {
          req.session.user = {
            uid: user.sub,
            firstName: user.given_name,
            lastName: user.family_name,
            email: user.email,
            services: [],
            orgCount: 0,
          };
        }
        return res.redirect(redirectUrl);
      });
    })(req, res, next);
  });

  // app routes
  app.use("/healthcheck", healthCheck({ config, version }));
  app.use("/", home(csrf, app));
  app.use("/signout", signOut(csrf));
  app.use("/organisations", organisations(csrf));
  if (config.toggles.useApproverJourney) {
    app.use("/approvals", users(csrf));
  }
  app.use("/request-organisation", requestOrganisation(csrf));
  app.use("/access-requests", accessRequests(csrf, app));
  app.use("/request-service", requestService(csrf));

  app.get("*", (req, res) => {
    res.status(404).render("errors/views/notFound");
  });
};

module.exports = routes;
