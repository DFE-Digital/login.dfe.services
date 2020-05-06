'use strict';

/* eslint-disable no-underscore-dangle */

const url = require('url');
const passport = require('passport');
const config = require('./../../infrastructure/config');
const logger = require('./../../infrastructure/logger');

const servicePostLogoutStore = require('./../services/servicePostLogoutStore');

const signUserOut = async (req, res) => {
  if (req.user && req.user.id_token) {
    logger.audit('User logged out', {
      type: 'Sign-out',
      userId: req.user.sub,
      email: req.user.email,
      client: 'services',
    });
    const idToken = req.user.id_token;
    let returnUrl, skipIssuerSession = false , isValidRedirect = false;
    if (req.query.redirected === 'true' && !req.query.redirect_uri) {
      returnUrl = `${config.hostingEnvironment.protocol}://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/signout/complete`;
    } else if (req.query.redirected === 'true' && req.query.redirect_uri) {
      returnUrl = req.query.redirect_uri;
      skipIssuerSession = true;
      isValidRedirect = await isValidRedirectUrl(req.query.redirect_uri);
    } else {
      returnUrl = `${config.hostingEnvironment.profileUrl}/signout`
    }
    req.logout();
    if (skipIssuerSession && isValidRedirect) {
      res.redirect(returnUrl);
    }else{
      const issuer = passport._strategies.oidc._issuer;
      res.redirect(url.format(Object.assign(url.parse(issuer.end_session_endpoint), {
        search: null,
        query: {
          id_token_hint: idToken,
          post_logout_redirect_uri: returnUrl,
        },
      })));
    }
  } else {
    let isValidRedirect;
    // Check for valid redirect URL
    if(req.query.redirect_uri) {
      isValidRedirect = await isValidRedirectUrl(req.query.redirect_uri);
    }
    // This is external service specific
    if(isValidRedirect){
      res.redirect(req.query.redirect_uri ? req.query.redirect_uri : '/');
    }else{
      res.redirect('/');
    }

  }
};

const isValidRedirectUrl = async (url) => {
  try {
    const serviceId = config.hostingEnvironment.serviceId;
    if(!serviceId){
      return false;
    }
    const getAllRedirectUrls = await servicePostLogoutStore.getServicePostLogoutRedirectsUrl(serviceId);
    const redirectUrl = getAllRedirectUrls.find(f => f.redirectUrl === url);
    if (redirectUrl) {
      return true;
    }
  } catch (e) {
    logger.error(`error getting service post logout url`)
    return false;
  }
  return false;
};

module.exports = signUserOut;

