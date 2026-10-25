require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../server');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const MenuItem = require('../models/MenuItem');
const Chef = require('../models/Chef');
const Review = require('../models/Review');
const GalleryImage = require('../models/GalleryImage');

// Helper to make HTTP requests with cookie jar
class TestClient {
  constructor(port) {
    this.port = port;
    this.cookies = '';
  }

  async request(method, path, body = null, isMultipart = false) {
    return new Promise((resolve, reject) => {
      const headers = {};
      if (this.cookies) headers['Cookie'] = this.cookies;

      let payload = null;
      if (body && !isMultipart) {
        payload = JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payload);
      }

      const options = {
        hostname: '127.0.0.1',
        port: this.port,
        path,
        method,
        headers,
      };

      const req = http.request(options, (res) => {
        // Collect cookies
        if (res.headers['set-cookie']) {
          const newCookies = res.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ');
          this.cookies = newCookies;
        }

        let resBody = '';
        res.on('data', (chunk) => {
          resBody += chunk;
        });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(resBody);
          } catch (e) {
            json = resBody;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      });

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  get(path) {
    return this.request('GET', path);
  }
  post(path, body) {
    return this.request('POST', path, body);
  }
  put(path, body) {
    return this.request('PUT', path, body);
  }
  patch(path, body) {
    return this.request('PATCH', path, body);
  }
  delete(path) {
    return this.request('DELETE', path);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log(' STARTING SAANJH FULL INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(` ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${testName} ${detail ? '(' + detail + ')' : ''}`);
      failed++;
    }
  }

  // Start temporary test server
  const TEST_PORT = 3344;
  const server = app.listen(TEST_PORT);
  await new Promise((r) => setTimeout(r, 500));

  try {
    const unauthClient = new TestClient(TEST_PORT);
    const customerClient = new TestClient(TEST_PORT);
    const customerClient2 = new TestClient(TEST_PORT);
    const adminClient = new TestClient(TEST_PORT);

    // -----------------------------------------------------------------
    // TEST 1: Health & Static serving
    // -----------------------------------------------------------------
    const health = await unauthClient.get('/api/health');
    assert(health.status === 200 && health.body.status === 'healthy', 'API health check responds OK');

    const indexHtml = await unauthClient.get('/');
    assert(indexHtml.status === 200 && typeof indexHtml.body === 'string' && indexHtml.body.includes('Saanjh'), 'Root URL serves Saanjh HTML');

    // -----------------------------------------------------------------
    // TEST 2: Customer Registration & Password Hashing
    // -----------------------------------------------------------------
    const testEmail = `testuser_${Date.now()}@example.com`;
    const regRes = await customerClient.post('/api/auth/register', {
      name: 'Rohan Verma',
      email: testEmail,
      phone: '+91 98765 22222',
      password: 'SecretPassword123!',
    });
    assert(regRes.status === 201 && regRes.body.success, 'Customer registration succeeds');
    assert(regRes.body.user.role === 'user', 'Customer registered role defaults to user');

    // Verify password is stored as hash in database
    const dbUser = await User.findOne({ email: testEmail });
    assert(dbUser && dbUser.password !== 'SecretPassword123!', 'Password is NOT stored in plain text');
    const isBcryptHash = await bcrypt.compare('SecretPassword123!', dbUser.password);
    assert(isBcryptHash, 'Password is correctly hashed with bcrypt');

    // Prevent duplicate email registration
    const dupRes = await unauthClient.post('/api/auth/register', {
      name: 'Duplicate Rohan',
      email: testEmail,
      password: 'AnotherPassword123!',
    });
    assert(dupRes.status === 400 && !dupRes.body.success, 'Duplicate email registration is blocked');

    // -----------------------------------------------------------------
    // TEST 3: Login, Session Restore, and Logout
    // -----------------------------------------------------------------
    const meRes = await customerClient.get('/api/auth/me');
    assert(meRes.status === 200 && meRes.body.authenticated && meRes.body.user.email === testEmail, 'Session persists and restores current user');

    // Logout
    const logoutRes = await customerClient.post('/api/auth/logout');
    assert(logoutRes.status === 200 && logoutRes.body.success, 'Customer logout succeeds');

    const meAfterLogout = await customerClient.get('/api/auth/me');
    assert(meAfterLogout.status === 200 && !meAfterLogout.body.authenticated, 'Session is destroyed after logout');

    // Log back in
    const loginRes = await customerClient.post('/api/auth/login', {
      email: testEmail,
      password: 'SecretPassword123!',
    });
    assert(loginRes.status === 200 && loginRes.body.success, 'Customer login succeeds');

    // Register 2nd customer
    const testEmail2 = `testuser2_${Date.now()}@example.com`;
    await customerClient2.post('/api/auth/register', {
      name: 'Aditi Rao',
      email: testEmail2,
      password: 'SecretPassword123!',
    });

    // -----------------------------------------------------------------
    // TEST 4: Admin Authentication & Authorization Protection
    // -----------------------------------------------------------------
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@saanjh.in').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

    const adminLoginRes = await adminClient.post('/api/auth/admin-login', {
      email: adminEmail,
      password: adminPassword,
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.body.user.role === 'admin', 'Administrator login succeeds');

    // Non-admin customer trying to admin-login
    const custAsAdminLogin = await unauthClient.post('/api/auth/admin-login', {
      email: testEmail,
      password: 'SecretPassword123!',
    });
    assert(custAsAdminLogin.status === 403, 'Regular customer denied at admin-login endpoint');

    // Customer trying to access Admin endpoints
    const custAdminReq = await customerClient.get('/api/reservations/admin/all');
    assert(custAdminReq.status === 403, 'Regular customer cannot access admin reservations (403)');

    const custMenuAdd = await customerClient.post('/api/menu', {
      name: 'Hacked Dish',
      price: 100,
      category: 'starter',
    });
    assert(custMenuAdd.status === 403, 'Regular customer cannot add menu dishes (403)');

    // -----------------------------------------------------------------
    // TEST 5: Public Dynamic Data (Menu, Chefs, Reviews, Settings)
    // -----------------------------------------------------------------
    const menuRes = await unauthClient.get('/api/menu');
    assert(menuRes.status === 200 && menuRes.body.items.length >= 70, 'Public Menu API returns seeded dishes (>= 70 items)');

    const chefsRes = await unauthClient.get('/api/chefs');
    assert(chefsRes.status === 200 && chefsRes.body.chefs.length >= 3, 'Public Chefs API returns seeded chefs (>= 3)');

    const reviewsRes = await unauthClient.get('/api/reviews');
    assert(reviewsRes.status === 200 && reviewsRes.body.reviews.length >= 3, 'Public Reviews API returns published reviews (>= 3)');

    const settingsRes = await unauthClient.get('/api/settings');
    assert(settingsRes.status === 200 && settingsRes.body.settings.restaurantName === 'Saanjh', 'Public Settings API returns restaurant info');

    // -----------------------------------------------------------------
    // TEST 6: Review Permissions & Ownership
    // -----------------------------------------------------------------
    // Unauthenticated user cannot create review
    const unauthReview = await unauthClient.post('/api/reviews', {
      rating: 5,
      comment: 'Spam from unauthenticated visitor',
    });
    assert(unauthReview.status === 401, 'Unauthenticated visitor cannot create review (401)');

    // Customer 1 posts review
    const postReviewRes = await customerClient.post('/api/reviews', {
      rating: 5,
      comment: 'Exceptional dining experience! The dal makhani was velvety and delicious.',
    });
    assert(postReviewRes.status === 201 && postReviewRes.body.success, 'Logged in customer can post review');
    const createdReviewId = postReviewRes.body.review._id;

    // Customer 2 tries to edit Customer 1's review
    const cust2Edit = await customerClient2.put(`/api/reviews/${createdReviewId}`, {
      comment: 'Tampered by someone else!',
    });
    assert(cust2Edit.status === 403, 'Customer 2 cannot edit Customer 1 review (403)');

    // Customer 2 tries to delete Customer 1's review
    const cust2Del = await customerClient2.delete(`/api/reviews/${createdReviewId}`);
    assert(cust2Del.status === 403, 'Customer 2 cannot delete Customer 1 review (403)');

    // Customer 1 edits their own review
    const cust1Edit = await customerClient.put(`/api/reviews/${createdReviewId}`, {
      comment: 'Updated review: Still wonderful after my second visit!',
    });
    assert(cust1Edit.status === 200 && cust1Edit.body.success, 'Customer 1 can edit their own review');

    // Admin can moderate/delete any review
    const adminReviewDel = await adminClient.delete(`/api/reviews/${createdReviewId}`);
    assert(adminReviewDel.status === 200 && adminReviewDel.body.success, 'Administrator can delete customer review');

    // -----------------------------------------------------------------
    // TEST 7: Table Reservation Availability & Booking
    // -----------------------------------------------------------------
    const testDate = '2026-11-15'; // future date
    const availRes = await unauthClient.get(`/api/reservations/availability?date=${testDate}&guests=2`);
    assert(availRes.status === 200 && availRes.body.slots.length > 0, 'Availability API returns valid slot list');
    const firstSlot = availRes.body.slots[0].slotMinutes;

    // Book reservation as customer
    const bookRes = await customerClient.post('/api/reservations/book', {
      customerName: 'Rohan Verma',
      phone: '+91 98765 22222',
      email: testEmail,
      date: testDate,
      timeSlot: firstSlot,
      guests: 4,
      specialRequests: 'Quiet corner table please',
    });
    assert(bookRes.status === 201 && bookRes.body.success, 'Customer can successfully book table reservation');
    assert(bookRes.body.reservation.reservationId.startsWith('SJ-'), 'Unique reservation ID generated');

    const createdResId = bookRes.body.reservation.id;

    // Check availability decreased
    const availAfter = await unauthClient.get(`/api/reservations/availability?date=${testDate}&guests=2`);
    const slotAfter = availAfter.body.slots.find((s) => s.slotMinutes === firstSlot);
    assert(slotAfter.tablesBooked >= 1, 'Slot tablesBooked count incremented after booking');

    // Customer can view own reservations
    const myBookings = await customerClient.get('/api/reservations/my-reservations');
    assert(myBookings.status === 200 && myBookings.body.reservations.some((r) => r._id === createdResId), 'Customer can retrieve own reservation in My Bookings');

    // -----------------------------------------------------------------
    // TEST 8: Reservation Capacity Enforcement & Overbooking Prevention
    // -----------------------------------------------------------------
    // Current tablesPerSlot is 6. We have booked 1 table for 4 guests.
    // Let's book remaining 5 tables (5 tables * 4 guests = 20 guests)
    const bookAllRemaining = await unauthClient.post('/api/reservations/book', {
      customerName: 'Big Group Booking',
      phone: '+91 98765 33333',
      date: testDate,
      timeSlot: firstSlot,
      guests: 20, // 5 tables
    });
    assert(bookAllRemaining.status === 201, 'Booked remaining tables to fill capacity');

    // Now slot is FULL. Attempting another booking MUST be rejected with 409
    const overbookAttempt = await unauthClient.post('/api/reservations/book', {
      customerName: 'Overbooked Guest',
      phone: '+91 98765 44444',
      date: testDate,
      timeSlot: firstSlot,
      guests: 2,
    });
    assert(overbookAttempt.status === 409 && !overbookAttempt.body.success, 'Overbooking rejected when slot is full (409 Conflict)');

    // Slot is reported as full in availability
    const fullCheck = await unauthClient.get(`/api/reservations/availability?date=${testDate}&guests=2`);
    const fullSlot = fullCheck.body.slots.find((s) => s.slotMinutes === firstSlot);
    assert(!fullSlot.isAvailable && fullSlot.statusText === 'Full', 'Availability API correctly marks slot as Full');

    // Reject past date reservation
    const pastBook = await unauthClient.post('/api/reservations/book', {
      customerName: 'Past Booker',
      phone: '+91 98765 55555',
      date: '2020-01-01',
      timeSlot: 720,
      guests: 2,
    });
    assert(pastBook.status === 400, 'Past date reservation is rejected (400)');

    // -----------------------------------------------------------------
    // TEST 9: Admin Management Features
    // -----------------------------------------------------------------
    // Admin views all reservations
    const adminResList = await adminClient.get('/api/reservations/admin/all');
    assert(adminResList.status === 200 && adminResList.body.reservations.length > 0, 'Admin can view all reservations');

    // Admin updates reservation status to completed
    const adminStatusUpdate = await adminClient.patch(`/api/reservations/admin/${createdResId}/status`, {
      status: 'completed',
    });
    assert(adminStatusUpdate.status === 200 && adminStatusUpdate.body.reservation.status === 'completed', 'Admin can update reservation status to completed');

    // Admin adds a new menu dish
    const newDishRes = await adminClient.post('/api/menu', {
      name: 'Paneer Zafrani Tikka',
      price: 240,
      category: 'starter',
      isVeg: true,
      description: 'Saffron marinated cottage cheese skewers grilled over charcoal',
    });
    assert(newDishRes.status === 201 && newDishRes.body.success, 'Admin can create menu item');
    const newDishId = newDishRes.body.item._id;

    // Verify dish appears in public menu immediately
    const updatedMenu = await unauthClient.get('/api/menu');
    assert(updatedMenu.body.items.some((i) => i._id === newDishId), 'Newly added dish appears immediately on public menu');

    // Admin edits dish
    const editDishRes = await adminClient.put(`/api/menu/${newDishId}`, {
      price: 260,
    });
    assert(editDishRes.status === 200 && editDishRes.body.item.price === 260, 'Admin can edit menu dish');

    // Admin deletes dish
    const delDishRes = await adminClient.delete(`/api/menu/${newDishId}`);
    assert(delDishRes.status === 200 && delDishRes.body.success, 'Admin can delete menu dish');

    // Admin adds chef
    const newChefRes = await adminClient.post('/api/chefs', {
      name: 'Kavita Sen',
      role: 'Master Baker',
      bio: 'Pâtisserie specialist crafting traditional Indian sweets with modern finesse.',
      specialties: ['Mithai', 'Desserts'],
      initials: 'KS',
    });
    assert(newChefRes.status === 201 && newChefRes.body.success, 'Admin can create chef profile');
    const newChefId = newChefRes.body.chef._id;

    // Verify chef appears publicly
    const updatedChefs = await unauthClient.get('/api/chefs');
    assert(updatedChefs.body.chefs.some((c) => c._id === newChefId), 'Newly added chef appears immediately on Our Chefs page');

    // Admin deletes chef
    const delChefRes = await adminClient.delete(`/api/chefs/${newChefId}`);
    assert(delChefRes.status === 200 && delChefRes.body.success, 'Admin can delete chef profile');

    // Admin updates website settings
    const updateSettingsRes = await adminClient.put('/api/settings', {
      phone: '+91 98765 99999',
    });
    assert(updateSettingsRes.status === 200 && updateSettingsRes.body.settings.phone === '+91 98765 99999', 'Admin can update restaurant settings');

    // Clean up test data
    await User.deleteMany({ email: { $in: [testEmail, testEmail2] } });
    await Reservation.deleteMany({ date: testDate });

    console.log('\n======================================================');
    console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal Test Suite Error:', err);
    server.close();
    process.exit(1);
  }
}

runTestSuite();
