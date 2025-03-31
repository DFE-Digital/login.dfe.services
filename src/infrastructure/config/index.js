

const fs = require('fs');
const Path = require('path');
const logger = require("./infrastructure/logger");

const getSettingsObject = (settings) => {
  logger.info("getting settings from object");
  try {
    return JSON.parse(settings);
  } catch (e) {
    return null;
  }
};

const getSettingsFromFile = (settingsPath) => {
  logger.info("in settings from file");
  if (fs.existsSync(settingsPath)) {
    const file = fs.readFileSync(settingsPath, 'utf8');
    try {
      return JSON.parse(file);
    } catch (e) {
      return null;
    }
  }
  return null;
};

const fetchConfig = () => {
  if (process.env.settings) {
    const settings = process.env.settings;
    let settingsObject = getSettingsObject(settings);
    logger.info("After settings from object");
    logger.info(settingsObject);
    if (settingsObject !== null) {
      return settingsObject;
    }
    const settingsPath = Path.resolve(settings);
    if (fs.existsSync(settingsPath)) {
      settingsObject = getSettingsFromFile(settingsPath);
      logger.info("After settings from file");
      logger.info(settingsObject);
      if (settingsObject !== null) {
        return settingsObject;
      }
    }
  }

  throw new Error('Missing configuration');
};

module.exports = fetchConfig();
