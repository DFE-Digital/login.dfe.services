const passport = require('passport');
const logger = require('./infrastructure/logger');
const config = require('./infrastructure/config');

const home = require('./app/home');
const services = require('./app/services');
const signOut = require('./app/signOut');
const healthCheck = require('login.dfe.healthcheck');

const routes = (app, csrf) => {
  // auth callbacks
  app.get('/auth', passport.authenticate('oidc'));
  app.get('/auth/cb', (req, res, next) => {
    passport.authenticate('oidc', (err, user) => {
      let redirectUrl = '/';

      if (err) {
        if (err.message.match(/state\smismatch/)) {
          req.session = null;
          return res.redirect('/');
        }
        logger.error(`Error in auth callback - ${err}`);
        return next(err);
      }
      if (!user) {
        return res.redirect('/');
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
        if (redirectUrl.endsWith('signout/complete')) redirectUrl = '/';
        return res.redirect(redirectUrl);
      });
    })(req, res, next);
  });

  // app routes
  app.use('/healthcheck', healthCheck({ config }));
  app.use('/', home(csrf));
  app.use('/services', services(csrf));
  app.use('/signout', signOut(csrf));
};

module.exports = routes;