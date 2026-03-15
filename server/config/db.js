'use strict';

const mongoose = require('mongoose');
const config   = require('./env');
const logger   = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.db.uri, {
      maxPoolSize:              config.db.poolSize,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS:          45_000,
    });
    logger.info('MongoDB connected', { host: conn.connection.host, db: conn.connection.name });
  } catch (err) {
    logger.error('MongoDB connection failed', { error: err.message });
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () =>
  logger.warn('MongoDB disconnected — attempting reconnect')
);

mongoose.connection.on('reconnected', () =>
  logger.info('MongoDB reconnected')
);

module.exports = connectDB;
