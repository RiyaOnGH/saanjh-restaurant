require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');

async function createAdmin() {
  try {
    await connectDB();

    const email = (process.argv[2] || process.env.ADMIN_EMAIL || 'admin@saanjh.in').toLowerCase().trim();
    const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'Admin@123456';
    const name = process.argv[4] || 'Saanjh Administrator';

    console.log(`Setting up Administrator account for: ${email}`);

    let user = await User.findOne({ email });
    if (user) {
      user.role = 'admin';
      user.password = password; // pre-save will re-hash
      user.name = name;
      await user.save();
      console.log(`Existing user ${email} successfully promoted to Administrator!`);
    } else {
      user = await User.create({
        name,
        email,
        password,
        role: 'admin',
      });
      console.log(`New Administrator account created successfully for ${email}!`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err.message);
    process.exit(1);
  }
}

createAdmin();
