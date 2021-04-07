const NodeCache = require('node-cache');
const logger = require('../logger');
const config = require('../config');


class AppCache {

    static store = new NodeCache({stdTTL: config.hostingEnvironment.appCacheExpiry?config.hostingEnvironment.appCacheExpiry:3600});

    /* Cache save function.
* It saves the value based on the key.
* parameters : key , value
* return : status - the save is success or not
*/
    static save(key, value) {
        try {
            const status = this.store.set(key, value);
            return status;
        }catch (e) {
            logger.error(`Error storing cache key :: Reason: ${e}`);
            return false;
        }
    };

    /* Cache retrieve function.
    * It retrieve the value based on the key.
    * parameters : key
    * return : Value of key
    */
    static retrieve(key) {
        return this.store.get(key);
    };

    /*
     * Delete the key from cache
     */
    static delete(key) {
        return this.store.del(key);
    };

// Gets all keys stored in the cache.
    static allKeys ()  {
        return this.store.keys();
    };

// Flush all keys stored in the cache.
    static flushAll  () {
        return this.store.flushAll();
    };

    static clear(){
        this.store.close();
        delete AppCache.instance;
    }
}

module.exports = AppCache;
