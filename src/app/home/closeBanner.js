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

const jobTitleBannerHandler = async (req, res) => { 
  if (!req.session.user) {
    return res.redirect('/my-services')
  }
  const userId = req.session.user.uid
  await createUserBanners(userId, 2)
  res.status(200).send('User banner acknowledgement received').end();
}

const passwordChangeBannerHandler = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/my-services')
  }
  const userId = req.session.user.uid
  
  const banner = await directories.fetchUserBanners(userId, -3) //-3: "Unacknowledged" banner for changed password
  if(banner) {
    await directories.updateUserBanners({id: banner.id, userId, bannerId: 3});
    res.status(200).send('User banner acknowledgement received').end();
  }
  res.status(200).end()
}

const createUserBanners = async (userId, bannerId) => {
  await directories.createUserBanners({
    userId,
    bannerId, 
  }) 
}
module.exports = { bannerHandler, jobTitleBannerHandler, passwordChangeBannerHandler };