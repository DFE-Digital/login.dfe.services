const { directories } = require('login.dfe.dao');

const jobTitleBannerHandler = async (req, res, inflight = false) => {
  if (!req.session.user) {
    return res.redirect('/my-services');
  }
  const userId = req.session.user.uid;
  const banner = await directories.fetchUserBanners(userId, 2);
  if (!banner) {
    await createUserBanners(userId, 2);
    if (!inflight) {
      res.status(200).send('User banner acknowledgement received').end();
    }
  }
};

const passwordChangeBannerHandler = async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/my-services');
  }
  const userId = req.session.user.uid;

  const banner = await directories.fetchUserBanners(userId, -3); //-3: "Unacknowledged" banner for changed password
  if (banner) {
    await directories.updateUserBanners({ id: banner.id, userId, bannerId: 3 });
    res.status(200).send('User banner acknowledgement received').end();
  }
  res.status(200).end();
};

const createUserBanners = async (userId, bannerId, bannerData) => {
  const payload = {
    userId,
    bannerId,
    bannerData: null,
  };

  if (typeof bannerData !== 'undefined' && bannerData !== null) {
    payload.bannerData = bannerData;
  }

  await directories.createUserBanners(payload);
};

const createSubServiceAddedBanners = async (endUserId, serviceName, rolesName) => {
  try {
    const bannerDetails = JSON.stringify({
      bannerType: 'Sub-service added',
      subServiceName: rolesName,
      serviceName,
    });
    await createUserBanners(endUserId, 4, bannerDetails);
  } catch (error) {
    throw new Error(
      `Failed to create the 'Sub-service added' banner for the user with ID [${endUserId}], service [${serviceName}], and sub-services: ${rolesName.join(
        ', ',
      )} - ${error}.
      `,
    );
  }
};
const createServiceAddedBanners = async (endUserId, serviceName) => {
  try {
    const bannerDetails = JSON.stringify({
      bannerType: 'Service added',
      serviceName,
    });
    await createUserBanners(endUserId, 5, bannerDetails);
  } catch (error) {
    throw new Error(
      `Failed to create the 'Service added' banner for the user with ID [${endUserId}], service [${serviceName}], and sub-services: ${rolesName.join(
        ', ',
      )} - ${error}.
      `,
    );
  }
};

const fetchNewServiceBanners = async(userId) => { 
  try {
  const result = await directories.fetchMultipleUserBanners(userId, 5);

  const banners = result.map(({ id, userId, bannerData }) => {
    let serviceName = null;

    if (bannerData) {
      const parsedBannerData = JSON.parse(bannerData);
      serviceName = parsedBannerData.serviceName || null;
    }

    return {
      id,
      userId,
      serviceName,
    };
  });

  return banners;
} catch (error) {
  throw new Error(`Error fetching 'Service added' banners for user ${userId} - ${error}.`);
}
};

const fetchSubServiceAddedBanners = async (userId) => {
  try {
    const result = await directories.fetchMultipleUserBanners(userId, 4);

    const banners = result.map(({ id, userId, bannerData }) => {
      let subServiceName = null;
      let serviceName = null;

      if (bannerData) {
        const parsedBannerData = JSON.parse(bannerData);
        subServiceName = parsedBannerData.subServiceName || null;
        serviceName = parsedBannerData.serviceName || null;
      }

      return {
        id,
        userId,
        subServiceName,
        serviceName,
      };
    });

    return banners;
  } catch (error) {
    throw new Error(`Error fetching 'Sub-service added' banners for user ${userId} - ${error}.`);
  }
};

const closeSubServiceAddedBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    if (!bannerId) {
      return res.redirect('/my-services');
    }

    await directories.deleteUserBanner(bannerId);
    res.status(200).send(`'Sub-service added' user banner with ID: ${bannerId} successfully removed.`).end();
  } catch (error) {
    throw new Error(`Error removing 'Sub-service added' banner with id ${bannerId} - ${error}.`);
  }
};

const closeServiceAddedBanner = async (req, res) => {
  try {
    const newServiceBanner = await fetchNewServiceBanners(req.user.id, 5);
  
    if(newServiceBanner){
      const banner = newServiceBanner.find((x) => x.serviceName === req.params.bannerId);
      if(banner){
      await directories.deleteUserBanner(banner.id);
      }
    }
    
    res.sendStatus(200).end();
  } catch (error) {
    throw new Error(`Error removing 'Service added' banner with id 5 - ${error}.`);
  }
};

module.exports = {
  jobTitleBannerHandler,
  passwordChangeBannerHandler,
  createSubServiceAddedBanners,
  fetchSubServiceAddedBanners,
  closeSubServiceAddedBanner,
  closeServiceAddedBanner,
  createServiceAddedBanners,
  createUserBanners,
  fetchNewServiceBanners,
};
