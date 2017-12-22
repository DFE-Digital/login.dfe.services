'use strict';

const config = require('./../config');
const { getServicesForUser } = require('../../infrastructure/services/index');

const APPROVER = 10000;

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.session.redirectUrl = req.originalUrl;
  return res.status(302).redirect('/auth');
};

const setApproverContext = async (req, res, next) => {
  res.locals.isApprover = false;
  if (req.user) {
    const user = req.user;
    const services = await getServicesForUser(user.sub);
    res.locals.isApprover = services.some(s => s.role.id >= APPROVER && s.status > 0);
  }
  next();
};

const getUserEmail = user => user.email || '';

const getUserDisplayName = user => `${user.given_name || ''} ${user.family_name || ''}`.trim();

const setUserContext = (req, res, next) => {
  if (req.user) {
    res.locals.user = req.user;
    res.locals.displayName = getUserDisplayName(req.user);
  }
  next();
};

const asyncMiddleware = fn =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };

const setConfigContext = (req, res, next) => {
  res.locals.profilesUrl = config.hostingEnvironment.profilesUrl;
  next();
}

module.exports = { isLoggedIn, getUserEmail, getUserDisplayName, setUserContext, setApproverContext, asyncMiddleware, setConfigContext };
