class ApplicationCache {
    constructor() {
        this._cache = {};

        // setInterval(() => {
        //     Object.entries(this._cache).forEach(([id, application]) => {
        //         let now = Date.now();
        //         if (now > application.expires) {
        //             delete this._cache[id]
        //         }
        //     });
        // }, 1000 * 60 * 30);     // check the cache every 30mins
    }

    getApplication(id) {
        if (this._cache[id]) {
            return this._cache[id].application;
        }
    }

    setApplication(id, value) {
        this._cache[id] = this._createCacheItem(id, value);
    }

    deleteCacheItem(id) {
        delete this._cache[id];
    }

    _createCacheItem(id, value) {
        return {
            application: value,
            expires: Date.now() + (1000 * 60 * 60 * 12)   // we will delete each item after 12hrs
        }
    }
}

module.exports = new ApplicationCache();