'use strict';

/* eslint-disable no-underscore-dangle */

const url = require('url');
const passport = require('passport');
const config = require('./../../infrastructure/config');
const logger = require('./../../infrastructure/logger');

const signUserOut = (req, res) => {
  if (req.user && req.user.id_token) {
    logger.audit('User logged out', {
      type: 'Sign-out',
      userId: req.user.sub,
      email: req.user.email,
      client: 'services',
    });
    const idToken = req.user.id_token;
    const issuer = passport._strategies.oidc._issuer;
    let returnUrl;
    if (req.query.redirected === 'true') {
      returnUrl = `${config.hostingEnvironment.protocol}://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/signout/complete`;
      // res.redirect(`${config.hostingEnvironment.protocol}://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/`);
    } else {
      returnUrl = `${config.hostingEnvironment.profileUrl}/signout?redirected=true`;
    }

    if (req.query.redirect_uri) {
      returnUrl += `&redirect_uri=${req.query.redirect_uri}`;
    }

    req.logout();
    res.redirect(url.format(Object.assign(url.parse(issuer.end_session_endpoint), {
      search: null,
      query: {
        id_token_hint: idToken,
        post_logout_redirect_uri: returnUrl,
      },
    })));
  } else if (req.query.redirected === 'true') {
    res.redirect(`${config.hostingEnvironment.protocol}://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/signout/complete`);
  }
  else {
    res.redirect('/');
  }
};

module.exports = signUserOut;

