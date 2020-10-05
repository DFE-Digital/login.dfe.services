'use strict';

/* eslint-disable no-underscore-dangle */

const url = require('url');
const passport = require('passport');
const config = require('./../../infrastructure/config');
const logger = require('./../../infrastructure/logger');

const servicePostLogoutStore = require('./../services/servicePostLogoutStore');

const signUserOut = async (req, res) => {
  if (req.user && req.user.id_token) {
    logger.audit( {
      type: 'Sign-out',
      userId: req.user.sub,
      email: req.user.email,
      client: 'services',
      application: config.loggerSettings.applicationName,
      env: config.hostingEnvironment.env,
      message: 'User logged out',
    });
    const idToken = req.user.id_token;
    let returnUrl,
      skipIssuerSession = false,
      isValidRedirect = false;
    if (req.query.redirected === 'true' && !req.query.redirect_uri) {
      logger.info('service signout :: there were no redirect_uri');
      returnUrl = `${config.hostingEnvironment.protocol}://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/signout/complete`;
    } else if (req.query.redirected === 'true' && req.query.redirect_uri) {
      logger.info('service signout :: there is redirect_uri');
      returnUrl = req.query.redirect_uri;
      skipIssuerSession = true;
      isValidRedirect = await isValidRedirectUrl(req.query.redirect_uri);
    } else {
      logger.info('service signout :: there is no redirect_uri and redirected');
      returnUrl = `${config.hostingEnvironment.profileUrl}/signout`;
    }
    logout(req, res);
    if (skipIssuerSession && isValidRedirect) {
      logger.info('service signout :: there is skipIssuer and a valid redirect');
      res.redirect(returnUrl);
    } else {
      logger.info('service signout :: there is no skipIssuer and no valid redirect');
      const issuer = passport._strategies.oidc._issuer;
      res.redirect(
        url.format(
          Object.assign(url.parse(issuer.end_session_endpoint), {
            search: null,
            query: {
              id_token_hint: idToken,
              post_logout_redirect_uri: returnUrl,
            },
          }),
        ),
      );
    }
  } else {
    let isValidRedirect;
    logout(req, res);
    // Check for valid redirect URL
    if (req.query.redirect_uri) {
      isValidRedirect = await isValidRedirectUrl(req.query.redirect_uri);
    }
    // This is external service specific
    if (isValidRedirect) {
      res.redirect(req.query.redirect_uri ? req.query.redirect_uri : '/');
    } else {
      res.redirect('/');
    }
  }
};

const logout = (req, res) => {
  req.logout();
  req.session = null; // Needed to clear session and completely logout
};

const isValidRedirectUrl = async (url) => {
  try {
    const serviceId = config.hostingEnvironment.serviceId;
    if (!serviceId) {
      logger.error('service signout :: No serviceId configured');
      return false;
    }
    const getAllRedirectUrls = await servicePostLogoutStore.getServicePostLogoutRedirectsUrl(serviceId);
    const redirectUrl = getAllRedirectUrls.find((f) => f.redirectUrl === url);
    if (redirectUrl) {
      return true;
    }
  } catch (e) {
    logger.error(`error getting service post logout url`);
    return false;
  }
  return false;
};

module.exports = signUserOut;
