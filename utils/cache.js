const NodeCache = require("node-cache");

// Default TTL of 1 hour (3600 seconds), check period of 2 minutes
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

/**
 * Cache key prefixes
 */
const CACHE_PREFIXES = {
    ITEMS: "items_",
    TAXES: "taxes_",
    DISCOUNTS: "discounts_",
    MENU: "menu_",
};

/**
 * Formats a cache key with restaurant ID
 * @param {string} prefix 
 * @param {string} restaurantId 
 * @returns {string}
 */
const getRestaurantKey = (prefix, restaurantId) => `${prefix}${restaurantId}`;

/**
 * Get data from cache or fetch it from DB and then cache it
 * @param {string} key Cache key
 * @param {Function} fetchFn Function to fetch data if not in cache
 * @returns {Promise<any>}
 */
const getOrSet = async (key, fetchFn) => {
    const value = cache.get(key);
    if (value !== undefined) {
        return value;
    }

    const result = await fetchFn();
    cache.set(key, result);
    return result;
};

/**
 * Invalidate a specific cache key
 * @param {string} key
 */
const invalidate = (key) => {
    cache.del(key);
};

/**
 * Invalidate all static data caches for a specific restaurant
 * @param {string} restaurantId 
 */
const invalidateRestaurant = (restaurantId) => {
    const keys = cache.keys();
    const restaurantKeys = keys.filter(key => key.endsWith(`_${restaurantId}`));
    cache.del(restaurantKeys);
};

module.exports = {
    cache,
    CACHE_PREFIXES,
    getRestaurantKey,
    getOrSet,
    invalidate,
    invalidateRestaurant,
};
