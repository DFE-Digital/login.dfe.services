const jwt = require('jsonwebtoken');
const { services } = require('login.dfe.dao');


const validateOpts = (audience, clockTolerance) => {
  if (!audience) {
    throw new Error('Must provide audience to auth middleware');
  }

  if (clockTolerance && isNaN(parseInt(clockTolerance))) {
    throw new Error('If provided, clockTolerance must be numeric for auth middleware')
  }
};

const getClient = async (decoded) => {
  if (!decoded.iss) {
    return {
      found: false,
      error: 'Missing iss claim',
    };
  }

  const client = await services.getById(decoded.iss);
  return {
    found: client ? true : false,
    details: client,
  };
};

const verifyToken = (token, client, audience, clockTolerance) => {
  const secret = client.apiSecret;
  if (!secret) {
    return 'Your client is not authorized to use this api';
  }

  try {
    const opts = {
      audience,
    };
    if (clockTolerance) {
      opts.clockTolerance = clockTolerance;
    }

    jwt.verify(token, secret, opts);
  } catch (e) {
    return e.message;
  }
};

const auth = ({ audience, clockTolerance }) => {
  validateOpts(audience, clockTolerance);

  return async (req, res, next) => {
    try {
      const authorization = req.get('authorization');
      if (!authorization) {
        return res.status(401).json({ success: false, message: 'Missing Authorization header' });
      }
      const headerValidation = authorization.match(/^bearer\s(.*)/i);
      if (!headerValidation) {
        return res.status(401).json({
          success: false,
          message: 'Malformed Authorization header. Should be bearer {token}'
        });
      }
      const token = headerValidation[1];
      const decoded = jwt.decode(token);

      const client = await getClient(decoded);
      if (!client.found) {
        return res.status(403).json({ success: false, message: 'Unknown issuer' });
      }

      const verificationError = verifyToken(token, client.details, audience, clockTolerance);
      if (verificationError) {
        return res.status(403).json({ success: false, message: verificationError });
      }

      req.client = client.details;
      return next();
    } catch (e) {
      next(e);
    }
  };
};


module.exports = auth;
