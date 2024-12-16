const sessionTimeout = (req, res) => {
  return res.render("signOut/views/session-timeout");
};

module.exports = sessionTimeout;
