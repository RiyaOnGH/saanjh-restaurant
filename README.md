# Saanjh — An Evening of Indian Flavours
## Full-Stack Restaurant Web Application

A complete full-stack restaurant website for **Saanjh — An Evening of Indian Flavours** (located near Pandra, Ranchi, Jharkhand). Built by preserving the existing frontend design (dark green sidebar, warm cream background, orange accents, DM Sans and Playfair Display typography) and integrating a Node.js, Express, MongoDB, and Mongoose backend.

---

## 🍽️ Key Features

### 1. Table Reservation System (High-Reliability Booking)
- **Live Slot Availability:** Real-time checking of 1-hour table slots between 11:00 AM and 10:00 PM (11:00 AM to 9:00 PM seating).
- **Capacity & Overbooking Enforcement:** Configurable table capacity per slot (`tablesPerSlot = 6`, `guestsPerTable = 4`). Automatically computes tables required, calculates remaining capacity, and prevents overbooking with HTTP `409 Conflict`.
- **Validation:** Server-side validation rejects past dates and past time slots (with a 30-minute advance notice buffer for current day bookings).
- **Persistent Storage:** Every booking is saved in MongoDB with a unique booking reference (`SJ-XXXX`), customer details, date, time slot, guest count, and status (`confirmed`, `pending`, `completed`, `cancelled`).
- **Customer Self-Service:** Logged-in customers can view their booking history in **My Reservations** and cancel upcoming bookings.

### 2. Customer Authentication & Permissions
- **Sign Up:** Secure account creation with name, email, phone number, and password (minimum 6 characters).
- **Password Security:** All passwords hashed using `bcryptjs` with salt rounds before database persistence. Plain text passwords are never stored.
- **Session Management:** Secure session cookies (`express-session`) backed by MongoDB session store (`connect-mongo`). Login state automatically restores upon page reload.
- **Role-Based Access Control:** Role is locked to `'user'` on public sign-up to prevent privilege escalation attacks.
- **Customer Permissions:**
  - Authenticated customers can post reviews, edit their own reviews, and delete only their own reviews.
  - Authenticated customers can upload photos to the gallery and delete photos they uploaded.
  - Unauthenticated visitors can view the public menu, chefs, reviews, gallery, and live route map, but cannot post reviews or upload photos without signing in.

### 3. Administrator Portal & Dashboard
- **Dedicated Admin Authentication:** Dedicated administrator login route (`/api/auth/admin-login`) enforcing `role === 'admin'`.
- **Protected Administrator Endpoints:** All admin endpoints and actions are protected by `isAdmin` server-side middleware. Regular customers are rejected with `403 Forbidden`.
- **Dashboard Views:**
  - **Reservations:** Comprehensive table listing all customer reservations with search (by name, phone, email, reference ID), status filters (Confirmed, Pending, Completed, Cancelled), date picker, instant status updates, and deletion.
  - **Menu Management:** Add new dishes, edit dish names, categories (Starters, Veg Mains, Non-Veg Mains, Rice & Biryani, Breads, Desserts, Drinks), prices, veg/non-veg indicator, availability status, and remove dishes.
  - **Chef Management:** Add new chefs, edit names, titles, initials, specialties, biographies, and remove chef profiles.
  - **Review Moderation:** View all submitted reviews, feature reviews on the public page, or remove inappropriate/spam reviews.
  - **Gallery Management:** View all guest and staff uploads with uploader name and date, upload administrative photos, or remove any image.
  - **Restaurant Settings:** Live configuration of opening hours, phone numbers, email, physical address, and table slot capacity.

### 4. Public Dynamic Data
- **Menu Page:** Dishes dynamically fetched from MongoDB, automatically categorized, and filterable by category chips.
- **Our Chefs Page:** Culinary profiles dynamically fetched from MongoDB.
- **Reviews Page:** Customer reviews rendered dynamically with star ratings and author badges.
- **Photo Gallery:** Powered by Cloudinary storage (or local disk fallback in `public/uploads/`).
- **Live Route Map:** Leaflet map with OSRM (Open Source Routing Machine) showing live driving directions and ETA to Saanjh in Ranchi.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES6+), Leaflet, Leaflet Routing Machine |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB with Mongoose ODM |
| **Session Store** | `express-session`, `connect-mongo` |
| **Security** | `bcryptjs`, `helmet`, `mongo-sanitize`, `express-rate-limit`, `cors` |
| **File Uploads** | `multer`, `cloudinary` (with local disk fallback) |
| **Validation** | `express-validator` |

---

## 📁 Project Structure

```
PROJECTFORCCL/
├── config/
│   ├── db.js                 # MongoDB connection & local mongod auto-spawn logic
│   └── cloudinary.js         # Cloudinary configuration with local disk fallback
├── controllers/
│   ├── authController.js     # User registration, login, admin login, session management
│   ├── reservationController.js # Slot availability, booking, capacity checks, admin filters
│   ├── reviewController.js   # Customer reviews, owner validation, admin moderation
│   ├── menuController.js     # Public menu listing, admin dish creation/editing/deletion
│   ├── chefController.js     # Chef profiles CRUD
│   ├── galleryController.js  # Gallery images upload & deletion
│   └── settingsController.js # Restaurant information & capacity settings
├── middleware/
│   ├── auth.js               # isAuthenticated & isAdmin authorization guards
│   ├── validation.js         # Input validation rules (express-validator)
│   ├── upload.js             # Multer file upload & image MIME type filters
│   └── errorHandler.js       # Centralized error handler
├── models/
│   ├── User.js               # User schema with bcrypt pre-save hashing
│   ├── Reservation.js        # Reservation schema with slot indexes
│   ├── Review.js             # Review schema with user reference
│   ├── Chef.js               # Chef culinary profiles schema
│   ├── MenuItem.js           # Menu dishes with dietary categories
│   ├── GalleryImage.js       # Gallery photos with uploader attribution
│   └── RestaurantSettings.js # Singleton restaurant configurations
├── routes/
│   ├── authRoutes.js         # /api/auth routes with rate limiting
│   ├── reservationRoutes.js  # /api/reservations routes
│   ├── reviewRoutes.js       # /api/reviews routes
│   ├── menuRoutes.js         # /api/menu routes
│   ├── chefRoutes.js         # /api/chefs routes
│   ├── galleryRoutes.js      # /api/gallery routes
│   └── settingsRoutes.js     # /api/settings routes
├── public/
│   ├── index.html            # Main Saanjh frontend application
│   ├── js/
│   │   └── app.js            # Frontend JavaScript connecting UI to REST APIs
│   ├── images/               # High-res extracted restaurant photos (cover + gallery)
│   └── uploads/              # Local storage directory for user uploads
├── scripts/
│   ├── seed.js               # Database seed script (70 menu dishes, 3 chefs, reviews, admin)
│   └── createAdmin.js        # CLI utility to create/promote admin accounts
├── test/
│   └── test_suite.js         # Integration test suite (44 automated test assertions)
├── .env                      # Active environment configuration
├── .env.example              # Safe environment variable template
├── package.json              # Project dependencies and npm scripts
├── saanjh.html               # Preserved original frontend reference
└── server.js                 # Express application entry point
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v24.13.1)
- **MongoDB** running locally (`mongodb://127.0.0.1:27017`) OR a free MongoDB Atlas cluster connection string.

### 2. Installation
Clone or navigate to the project directory and install dependencies:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file from `.env.example`:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/saanjh_restaurant
SESSION_SECRET=saanjh_super_secret_session_key_production_replace_this

# Initial Administrator Credentials
ADMIN_EMAIL=admin@saanjh.in
ADMIN_PASSWORD=Admin@123456

# Optional Cloudinary (leaves local storage active if blank)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### 4. Database Seeding
Populate the database with the initial administrator, sample customer, 70 authentic menu dishes across 7 categories, 3 culinary chefs, initial reviews, and gallery images:
```bash
npm run seed
```

### 5. Running the Application
Start the server:
```bash
npm start
```
Open your browser and visit: **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Default Credentials

### Administrator Account
- **Email:** `admin@saanjh.in`
- **Password:** `Admin@123456`
- **Access:** Click **Sign In / Register** in the topbar, switch to the **Admin Portal** tab, and sign in. The **🛡️ Admin Dashboard** navigation tab will appear in the sidebar.

### Sample Customer Account
- **Email:** `priya@example.com`
- **Password:** `Customer@123456`
- **Access:** Sign in under the **Customer Sign In** tab.

*You can also register any new customer account directly via the **Register** tab.*

---

## 🧪 Automated Testing

The project includes an integration test suite verifying 44 test assertions across authentication, password hashing, session restore, authorization boundaries, slot availability, overbooking rejection, and admin CRUD operations.

Run the test suite:
```bash
npm test
```

---

## 🌐 Production Deployment

### Deploying to Render / Railway / Heroku
1. Push this repository to GitHub or GitLab.
2. In your hosting platform:
   - Build Command: `npm install`
   - Start Command: `npm start`
3. Configure Environment Variables:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: Your MongoDB Atlas URI (`mongodb+srv://...`)
   - `SESSION_SECRET`: A long random string
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (if using Cloudinary)
4. Run the seed script once in the hosting console or release phase:
   ```bash
   npm run seed
   ```
5. Your application is live with full security headers, rate limiting, and session persistence!
