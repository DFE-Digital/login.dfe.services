const saveSession = (session) =>
  new Promise((resolve, reject) =>
    session.save((err) => (err ? reject(err) : resolve())),
  );

module.exports = {
  saveSession,
};
