/* eslint-disable no-param-reassign */
const config = require('../config');
const { Strategy, Issuer, generators } = require('openid-client');
const logger = require('../logger');
const asyncRetry = require('login.dfe.async-retry');

const getPassportStrategy = async () => {
  Issuer.defaultHttpOptions = { timeout: 10000 };
  const issuer = await asyncRetry(
    async () => await Issuer.discover(config.identifyingParty.url),
    asyncRetry.strategies.apiStrategy,
  );
  const client = new issuer.Client({
    client_id: config.identifyingParty.clientId,
    client_secret: config.identifyingParty.clientSecret,
  });
  console.log('signout url: ', client.issuer.end_session_endpoint);
  if (config.identifyingParty.clockTolerance && config.identifyingParty.clockTolerance > 0) {
    client.CLOCK_TOLERANCE = config.identifyingParty.clockTolerance;
  }

  const code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);

  return new Strategy(
    {
      client,
      params: {
        redirect_uri: `${config.hostingEnvironment.protocol}://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/auth/cb`,
        scope: 'openid profile email',
        code_challenge,
        code_challenge_method: 'S256',
      },
    },
    (tokenset, authUserInfo, done) => {
      client
        .userinfo(tokenset.access_token)
        .then((userInfo) => {
          userInfo.id = userInfo.sub;
          userInfo.name = userInfo.sub;
          userInfo.id_token = tokenset.id_token;

          done(null, userInfo);
        })
        .catch((err) => {
          logger.error(err);
          done(err);
        });
    },
  );
};

module.exports = getPassportStrategy;
