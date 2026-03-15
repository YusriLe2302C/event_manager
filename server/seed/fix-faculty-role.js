require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User     = require('../models/User.model');

const EMAIL = process.argv[2];
if (!EMAIL) { console.error('Usage: node seed/fix-faculty-role.js <email>'); process.exit(1); }

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await User.updateOne({ email: EMAIL }, { $set: { role: 'faculty' } });
  if (result.matchedCount === 0) console.error(`No user found with email: ${EMAIL}`);
  else console.log(`[Fix] ${EMAIL} role set to faculty`);
  process.exit(0);
};

run().catch((err) => { console.error(err.message); process.exit(1); });
