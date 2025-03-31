const fs = require('fs');
const Path = require('path');

const getSettingsObject = (settings) => {
  console.log("getting settings from object");
  try {
    return JSON.parse(settings);
  } catch (e) {
    return null;
  }
};

const getSettingsFromFile = (settingsPath) => {
  console.log("in settings from file");
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
    console.log("After settings from object");
    if (settingsObject !== null) {
      return settingsObject;
    }
    const settingsPath = Path.resolve(settings);
    if (fs.existsSync(settingsPath)) {
      settingsObject = getSettingsFromFile(settingsPath);
      console.log("After settings from file");
      if (settingsObject !== null) {
        return settingsObject;
      }
    }
  }

  throw new Error('Missing configuration');
};

module.exports = fetchConfig();
