const cache = require('../config/cache');

// Usage: router.get('/events', cacheFor(300), handler)
const cacheFor = (ttl) => (req, res, next) => {
  const key = `__cache__${req.originalUrl}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return res.status(200).json(cached);
  }
  // Intercept res.json to store response in cache
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200) cache.set(key, body, ttl);
    return originalJson(body);
  };
  next();
};

const clearCache = (pattern) => {
  const keys = cache.keys().filter((k) => k.includes(pattern));
  keys.forEach((k) => cache.del(k));
};

module.exports = { cacheFor, clearCache };
