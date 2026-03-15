'use strict';

const NodeCache = require('node-cache');
const config    = require('./env');

const cache = new NodeCache({
  stdTTL:      config.cache.ttl,
  checkperiod: config.cache.checkPeriod,
  useClones:   false,
});

module.exports = cache;
