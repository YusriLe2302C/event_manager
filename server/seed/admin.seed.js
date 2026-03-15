require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User.model');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[Seed] Connected to MongoDB');

  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

  const exists = await User.findOne({ role: 'superadmin' });
  if (exists) {
    await User.updateOne(
      { _id: exists._id },
      {
        $set: {
          email:         process.env.ADMIN_EMAIL,
          password:      hashedPassword,
          loginAttempts: 0,
          isActive:      true,
        },
        $unset: { lockUntil: 1, refreshToken: 1 },
      }
    );
    console.log(`[Seed] Admin reset: ${process.env.ADMIN_EMAIL}`);
    return process.exit(0);
  }

  await User.create({
    name:     'Super Admin',
    email:    process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role:     'superadmin',
  });

  console.log(`[Seed] Admin created: ${process.env.ADMIN_EMAIL}`);
  process.exit(0);
};

seed().catch((err) => {
  console.error('[Seed] Error:', err.message);
  process.exit(1);
});
