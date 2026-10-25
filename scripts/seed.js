require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Chef = require('../models/Chef');
const Review = require('../models/Review');
const GalleryImage = require('../models/GalleryImage');
const RestaurantSettings = require('../models/RestaurantSettings');

const chefsData = [
  {
    name: 'Rajesh Kumar',
    role: 'Head Chef',
    bio: '18 years of experience in tandoor and North Indian cooking.',
    specialties: ['Tandoor', 'Biryani'],
    initials: 'RK',
    order: 1,
  },
  {
    name: 'Meera Devi',
    role: 'Sous Chef',
    bio: 'Brings authentic Jharkhandi home recipes to our kitchen.',
    specialties: ['Jharkhandi', 'Thali'],
    initials: 'MD',
    order: 2,
  },
  {
    name: 'Sana Ahmed',
    role: 'Pastry Chef',
    bio: 'Creates our desserts fresh every morning.',
    specialties: ['Desserts', 'Baking'],
    initials: 'SA',
    order: 3,
  },
];

const menuData = [
  // Starters
  { name: 'Veg Manchurian (Dry)', price: 160, category: 'starter', isVeg: true, order: 1 },
  { name: 'Paneer Chilli (Dry)', price: 190, category: 'starter', isVeg: true, order: 2 },
  { name: 'Crispy Corn Pepper Salt', price: 170, category: 'starter', isVeg: true, order: 3 },
  { name: 'Hara Bhara Kebab (6 Pcs)', price: 150, category: 'starter', isVeg: true, order: 4 },
  { name: 'Chicken Chilli (Dry)', price: 210, category: 'starter', isVeg: false, order: 5 },
  { name: 'Chicken 65', price: 220, category: 'starter', isVeg: false, order: 6 },
  { name: 'Fish Finger (6 Pcs)', price: 280, category: 'starter', isVeg: false, order: 7 },
  { name: 'Paneer Tikka', price: 200, category: 'starter', isVeg: true, order: 8 },
  { name: 'Chicken Tikka Kebab', price: 240, category: 'starter', isVeg: false, order: 9 },
  { name: 'Tandoori Chicken (Half)', price: 260, category: 'starter', isVeg: false, order: 10 },

  // Veg Mains
  { name: 'Paneer Butter Masala', price: 220, category: 'veg', isVeg: true, order: 1 },
  { name: 'Kadai Paneer', price: 230, category: 'veg', isVeg: true, order: 2 },
  { name: 'Malfai Kofta', price: 210, category: 'veg', isVeg: true, order: 3 },
  { name: 'Mix Veg Handi', price: 170, category: 'veg', isVeg: true, order: 4 },
  { name: 'Mushroom Do Pyaza', price: 190, category: 'veg', isVeg: true, order: 5 },
  { name: 'Aloo Dum Bhojpuri', price: 140, category: 'veg', isVeg: true, order: 6 },
  { name: 'Dal Makhani', price: 160, category: 'veg', isVeg: true, order: 7 },
  { name: 'Dal Fry (Double Tadka)', price: 120, category: 'veg', isVeg: true, order: 8 },
  { name: 'Chana Masala', price: 140, category: 'veg', isVeg: true, order: 9 },
  { name: 'Paneer Do Pyaza', price: 220, category: 'veg', isVeg: true, order: 10 },

  // Non-Veg Mains
  { name: 'Chicken Jharkhandi (Full)', price: 730, category: 'nonveg', isVeg: false, order: 1 },
  { name: 'Chicken Butter Masala', price: 260, category: 'nonveg', isVeg: false, order: 2 },
  { name: 'Kadai Chicken', price: 250, category: 'nonveg', isVeg: false, order: 3 },
  { name: 'Chicken Dehati (Half)', price: 340, category: 'nonveg', isVeg: false, order: 4 },
  { name: 'Chicken Tikka Masala', price: 280, category: 'nonveg', isVeg: false, order: 5 },
  { name: 'Mutton Rogan Josh', price: 380, category: 'nonveg', isVeg: false, order: 6 },
  { name: 'Mutton Handi', price: 390, category: 'nonveg', isVeg: false, order: 7 },
  { name: 'Egg Curry (2 Eggs)', price: 130, category: 'nonveg', isVeg: false, order: 8 },
  { name: 'Fish Curry (Rahu)', price: 220, category: 'nonveg', isVeg: false, order: 9 },
  { name: 'Chicken Bhuna', price: 260, category: 'nonveg', isVeg: false, order: 10 },

  // Rice & Biryani
  { name: 'Veg Dum Biryani', price: 180, category: 'rice', isVeg: true, order: 1 },
  { name: 'Chicken Dum Biryani', price: 240, category: 'rice', isVeg: false, order: 2 },
  { name: 'Mutton Dum Biryani', price: 320, category: 'rice', isVeg: false, order: 3 },
  { name: 'Egg Biryani', price: 160, category: 'rice', isVeg: false, order: 4 },
  { name: 'Jeera Rice', price: 100, category: 'rice', isVeg: true, order: 5 },
  { name: 'Steamed Basmati Rice', price: 80, category: 'rice', isVeg: true, order: 6 },
  { name: 'Veg Fried Rice', price: 140, category: 'rice', isVeg: true, order: 7 },
  { name: 'Chicken Fried Rice', price: 180, category: 'rice', isVeg: false, order: 8 },
  { name: 'Schezwan Fried Rice', price: 150, category: 'rice', isVeg: true, order: 9 },
  { name: 'Kashmiri Pulao', price: 170, category: 'rice', isVeg: true, order: 10 },

  // Breads
  { name: 'Tandoori Roti (Plain)', price: 15, category: 'bread', isVeg: true, order: 1 },
  { name: 'Butter Roti', price: 20, category: 'bread', isVeg: true, order: 2 },
  { name: 'Plain Naan', price: 35, category: 'bread', isVeg: true, order: 3 },
  { name: 'Butter Naan', price: 45, category: 'bread', isVeg: true, order: 4 },
  { name: 'Garlic Naan', price: 60, category: 'bread', isVeg: true, order: 5 },
  { name: 'Laccha Paratha', price: 40, category: 'bread', isVeg: true, order: 6 },
  { name: 'Masala Kulcha', price: 65, category: 'bread', isVeg: true, order: 7 },
  { name: 'Missi Roti', price: 30, category: 'bread', isVeg: true, order: 8 },
  { name: 'Rumali Roti', price: 25, category: 'bread', isVeg: true, order: 9 },
  { name: 'Paneer Paratha', price: 70, category: 'bread', isVeg: true, order: 10 },

  // Desserts
  { name: 'Gulab Jamun (2 Pcs)', price: 60, category: 'dessert', isVeg: true, order: 1 },
  { name: 'Rasgulla (2 Pcs)', price: 50, category: 'dessert', isVeg: true, order: 2 },
  { name: 'Sizzling Brownie with Ice Cream', price: 180, category: 'dessert', isVeg: true, order: 3 },
  { name: 'Tutti Frutti Ice Cream Sundae', price: 140, category: 'dessert', isVeg: true, order: 4 },
  { name: 'Kesar Pista Kulfi', price: 70, category: 'dessert', isVeg: true, order: 5 },
  { name: 'Vanilla Ice Cream (Single Scoop)', price: 50, category: 'dessert', isVeg: true, order: 6 },
  { name: 'Chocolate Lava Cake', price: 110, category: 'dessert', isVeg: true, order: 7 },
  { name: 'Gajar Ka Halwa (Seasonal)', price: 90, category: 'dessert', isVeg: true, order: 8 },
  { name: 'Moong Dal Halwa', price: 90, category: 'dessert', isVeg: true, order: 9 },
  { name: 'Rasmalai (2 Pcs)', price: 80, category: 'dessert', isVeg: true, order: 10 },

  // Drinks
  { name: 'Masala Cold Drink', price: 50, category: 'drink', isVeg: true, order: 1 },
  { name: 'Fresh Lime Soda (Salted/Sweet)', price: 60, category: 'drink', isVeg: true, order: 2 },
  { name: 'Sweet Lassi', price: 70, category: 'drink', isVeg: true, order: 3 },
  { name: 'Mango Shake', price: 90, category: 'drink', isVeg: true, order: 4 },
  { name: 'Virgin Mojito', price: 120, category: 'drink', isVeg: true, order: 5 },
  { name: 'Cold Coffee with Ice Cream', price: 110, category: 'drink', isVeg: true, order: 6 },
  { name: 'Mineral Water (1 Litre)', price: 30, category: 'drink', isVeg: true, order: 7 },
  { name: 'Masala Chai', price: 25, category: 'drink', isVeg: true, order: 8 },
  { name: 'Blue Lagoon Mocktail', price: 130, category: 'drink', isVeg: true, order: 9 },
  { name: 'Buttermilk (Chaas)', price: 40, category: 'drink', isVeg: true, order: 10 },
];

const initialReviews = [
  {
    authorName: 'Priya Sharma',
    authorLabel: 'Regular Guest',
    rating: 5,
    comment: 'The food was delicious, the place felt cozy, and the service was wonderful. Definitely coming back with my family.',
    featured: false,
    status: 'published',
  },
  {
    authorName: 'Aman Kumar',
    authorLabel: 'Food Blogger',
    rating: 5,
    comment: 'Their biryani is full of flavor, and the staff makes you feel welcome from the moment you walk in.',
    featured: true,
    status: 'published',
  },
  {
    authorName: 'Riya Singh',
    authorLabel: 'Happy Customer',
    rating: 5,
    comment: 'Perfect place for a relaxed dinner. The brownie was amazing and the atmosphere was beautiful.',
    featured: false,
    status: 'published',
  },
];

const initialGallery = [
  {
    imageUrl: '/images/gallery/gallery-1.jpg',
    publicId: 'seed-gallery-1',
    caption: 'Outdoor seating area with plants and wooden ceiling',
    provider: 'local',
  },
  {
    imageUrl: '/images/gallery/gallery-2.jpg',
    publicId: 'seed-gallery-2',
    caption: 'Restaurant entrance pathway with brick walls and plants',
    provider: 'local',
  },
  {
    imageUrl: '/images/gallery/gallery-3.jpg',
    publicId: 'seed-gallery-3',
    caption: 'Chicken curry, pulao, roti and fresh salad served on a marble table',
    provider: 'local',
  },
  {
    imageUrl: '/images/gallery/gallery-4.jpg',
    publicId: 'seed-gallery-4',
    caption: 'Kebab platter with laccha paratha, curry and chutneys',
    provider: 'local',
  },
  {
    imageUrl: '/images/gallery/gallery-5.jpg',
    publicId: 'seed-gallery-5',
    caption: 'Dining hall with cozy lights and warm atmosphere',
    provider: 'local',
  },
];

async function seed() {
  try {
    await connectDB();
    console.log('Seeding Saanjh database...');

    // 1. Initial Administrator
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@saanjh.in').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: 'Saanjh Administrator',
        email: adminEmail,
        phone: '+91 98765 43210',
        password: adminPassword,
        role: 'admin',
      });
      console.log(`Administrator created: ${adminEmail} (password: ${adminPassword})`);
    } else {
      console.log(`Administrator account exists: ${adminEmail}`);
    }

    // 2. Sample customer
    const customerEmail = 'priya@example.com';
    let customer = await User.findOne({ email: customerEmail });
    if (!customer) {
      customer = await User.create({
        name: 'Priya Sharma',
        email: customerEmail,
        phone: '+91 98765 11111',
        password: 'Customer@123456',
        role: 'user',
      });
      console.log(`Sample customer created: ${customerEmail} (password: Customer@123456)`);
    }

    // 3. Chefs
    const chefCount = await Chef.countDocuments();
    if (chefCount === 0) {
      await Chef.insertMany(chefsData);
      console.log(`Seeded ${chefsData.length} chefs.`);
    } else {
      console.log(`Chefs already exist (${chefCount} found).`);
    }

    // 4. Menu Items
    const menuCount = await MenuItem.countDocuments();
    if (menuCount === 0) {
      await MenuItem.insertMany(menuData);
      console.log(`Seeded ${menuData.length} menu items.`);
    } else {
      console.log(`Menu items already exist (${menuCount} found).`);
    }

    // 5. Reviews
    const reviewCount = await Review.countDocuments();
    if (reviewCount === 0) {
      const reviewsToInsert = initialReviews.map((r, i) => ({
        ...r,
        user: i === 0 ? customer._id : null,
      }));
      await Review.insertMany(reviewsToInsert);
      console.log(`Seeded ${initialReviews.length} customer reviews.`);
    } else {
      console.log(`Reviews already exist (${reviewCount} found).`);
    }

    // 6. Gallery
    const galleryCount = await GalleryImage.countDocuments();
    if (galleryCount === 0) {
      await GalleryImage.insertMany(initialGallery);
      console.log(`Seeded ${initialGallery.length} gallery images.`);
    } else {
      console.log(`Gallery images already exist (${galleryCount} found).`);
    }

    // 7. Settings
    await RestaurantSettings.getSettings();
    console.log('Restaurant settings initialized.');

    console.log('Database seeding successfully finished!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
