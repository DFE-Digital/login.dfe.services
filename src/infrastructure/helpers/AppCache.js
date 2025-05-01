const NodeCache = require("node-cache");
const config = require("../config");

const store = new NodeCache({
  stdTTL: config.hostingEnvironment.appCacheExpiry
    ? config.hostingEnvironment.appCacheExpiry
    : 3600,
});

class AppCache {
  /* Cache save function.
   * It saves the value based on the key.
   * parameters : key , value
   * return : status - the save is success or not
   */
  static save(key, value) {
    try {
      const status = store.set(key, value);
      return status;
    } catch {
      return false;
    }
  }

  /* Cache retrieve function.
   * It retrieve the value based on the key.
   * parameters : key
   * return : Value of key
   */
  static retrieve(key) {
    return store.get(key);
  }

  /*
   * Delete the key from cache
   */
  static delete(key) {
    return store.del(key);
  }

  // Gets all keys stored in the cache.
  static allKeys() {
    return store.keys();
  }

  // Flush all keys stored in the cache.
  static flushAll() {
    return store.flushAll();
  }

  static clear() {
    store.close();
    delete AppCache.instance;
  }
}

module.exports = AppCache;
