const { directories } = require('login.dfe.dao');
const bannerHandler = async (req, res) => { 
  if (!req.session.user) {
    return res.redirect('/my-services')
  }
  const userId = req.session.user.uid
  const bannerId = req.session.bannerId
  await directories.createUserBanners({
    userId,
    bannerId, 
  })
  res.status(200).send('User banner acknowledgement received').end();
}
module.exports = bannerHandler;