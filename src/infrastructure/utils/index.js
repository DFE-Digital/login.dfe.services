'use strict';

const config = require('./../config');
const {
  getOrganisationAndServiceForUserV2,
  getAllRequestsForApprover,
  getAllRequestsTypesForApprover,
} = require('./../organisations');

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated() || req.originalUrl.startsWith('/signout?redirected=true')) {
    res.locals.isLoggedIn = true;
    return next();
  }
  req.session.redirectUrl = req.originalUrl;
  return res.status(302).redirect('/auth');
};

const addSessionRedirect = (errorPageRenderer, logger = console) => {
  if (typeof errorPageRenderer !== 'function') {
    throw new Error('addSessionRedirect errorPageRenderer must be a function');
  }

  if (typeof logger.error !== 'function') {
    throw new Error('addSessionRedirect logger must have an error method');
  }

  return (req, res, next) => {
    res.sessionRedirect = (redirectLocation) => {
      if (typeof redirectLocation !== 'string') {
        throw new Error('sessionRedirect redirect location must be a string');
      }

      req.session.save((error) => {
        if (error) {
          const initialError = error instanceof Error ? error.message : error;
          const errorMessage = `Error saving session for request ${req.method} ${req.originalUrl}: ${initialError}`;
          logger.error(errorMessage, {
            correlationId: req.id,
            stack:
              error instanceof Error
                ? (error.stack ?? 'No stack trace provided on Error object')
                : 'No stack trace available as error is not an Error instance',
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
    const userApproverOrgs = req.userOrganisations.filter((x) => x.role.id === 10000);
    if (userApproverOrgs.find((x) => x.organisation.id.toLowerCase() === req.params.orgId.toLowerCase())) {
      return next();
    }
  }
  return res.status(401).render('errors/views/notAuthorised');
};

const isApproverInSomeOrgs = (req, res, next) => {
  if (req.userOrganisations) {
    const userApproverOrgs = req.userOrganisations.filter((x) => x.role.id === 10000);
    if (userApproverOrgs.length > 0) {
      return next();
    }
  }
  return res.status(401).render('errors/views/notAuthorised');
};

const isSelfRequest = (req, res, next) => {
  if (req.user && req.user.sub === req.params.uid) {
    return next();
  }
  return res.status(401).render('errors/views/notAuthorised');
};

const getUserEmail = (user) => user.email || '';

const getUserDisplayName = (user) => `${user.given_name || ''} ${user.family_name || ''}`.trim();

const setUserContext = async (req, res, next) => {
  if (req.user) {
    res.locals.user = req.user;
    res.locals.displayName = getUserDisplayName(req.user);
    const organisations = await getOrganisationAndServiceForUserV2(req.user.sub, req.id);
    req.userOrganisations = organisations;
    try {
      if (req.userOrganisations) {
        res.locals.isApprover = req.userOrganisations.filter((x) => x.role.id === 10000).length > 0;
      }
      if (res.locals.isApprover) {
        const approverOrgRequests = await getAllRequestsForApprover(req.user.sub, req.id);
        const { totalNumberOfRecords } = await getAllRequestsTypesForApprover(req.user.sub, req.id);
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

const mapUserStatus = (status, changedOn = null) => {
  // TODO: use userStatusMap
  if (status === -2) {
    return { id: -2, description: 'Deactivated Invitation', changedOn };
  }
  if (status === -1) {
    return { id: -1, description: 'Invited', changedOn };
  }
  if (status === 0) {
    return { id: 0, description: 'Deactivated', changedOn };
  }
  return { id: 1, description: 'Active', changedOn };
};

const mapRole = (roleId) => {
  if (roleId === 10000) {
    return { id: 10000, description: 'Approver' };
  }
  return { id: 0, description: 'End user' };
};

module.exports = {
  isLoggedIn,
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
