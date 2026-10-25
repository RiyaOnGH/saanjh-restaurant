/* ================= SAANJH RESTAURANT FULL-STACK CLIENT ================= */

// Application State
let currentUser = null;
let currentSettings = null;
let selectedSlot = null; // minutes since midnight
let activeAdminTab = 'admin-reservations';

// DOM References
const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const pageTitle = document.getElementById("page-title");
const pageSub = document.getElementById("page-sub");
const openBadge = document.getElementById("open-badge");

/* ================= 1. VIEW NAVIGATION ================= */
function showView(id) {
  const target = document.getElementById(id);
  if (!target) return;
  views.forEach(v => v.classList.remove("active"));
  target.classList.add("active");

  navButtons.forEach(b => b.classList.toggle("active", b.dataset.view === id));
  if (pageTitle && target.dataset.title) pageTitle.textContent = target.dataset.title;
  if (pageSub && target.dataset.sub) pageSub.textContent = target.dataset.sub;

  closeSidebar();
  window.scrollTo(0, 0);
  try { history.replaceState(null, "", "#" + id); } catch (e) {}

  // Leaflet map refresh when visible
  if (id === "location" && window.map) {
    setTimeout(() => window.map.invalidateSize(), 50);
    setTimeout(() => window.map.invalidateSize(), 200);
  }
  document.dispatchEvent(new CustomEvent("viewchange", { detail: id }));

  // Load view-specific dynamic data
  if (id === "admin" && currentUser && currentUser.role === "admin") {
    loadAdminTab(activeAdminTab);
  }
}

navButtons.forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => showView(b.dataset.go)));

function openSidebar() { sidebar.classList.add("open"); overlay.classList.add("show"); }
function closeSidebar() { sidebar.classList.remove("open"); overlay.classList.remove("show"); }
const burgerBtn = document.getElementById("burger");
if (burgerBtn) burgerBtn.addEventListener("click", openSidebar);
if (overlay) overlay.addEventListener("click", closeSidebar);

/* ================= 2. OPEN / CLOSED BADGE ================= */
function updateOpenBadge(openHour = 11, closeHour = 22.5) {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  const open = h >= openHour && h < closeHour;
  if (openBadge) {
    openBadge.textContent = open ? "Open now" : "Closed now";
    openBadge.classList.toggle("closed", !open);
  }
}

/* ================= 3. AUTHENTICATION & USER STATE ================= */
const authModal = document.getElementById("auth-modal");
const authOpenBtn = document.getElementById("auth-open-btn");
const userInfoArea = document.getElementById("user-info-area");
const adminNavBtn = document.getElementById("admin-nav-btn");
const customerBookingsCard = document.getElementById("customer-bookings-card");

// Tab switching inside auth modal
document.querySelectorAll(".auth-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.authtab;
    document.getElementById("cust-login-form").style.display = tab === "cust-login" ? "grid" : "none";
    document.getElementById("cust-register-form").style.display = tab === "cust-register" ? "grid" : "none";
    document.getElementById("admin-login-form").style.display = tab === "admin-login" ? "grid" : "none";
    clearAuthMessages();
  });
});

function clearAuthMessages() {
  ["cl-msg", "cr-msg", "al-msg"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ""; el.className = "alert-msg"; }
  });
}

function showAuthModal(defaultTab = "cust-login") {
  clearAuthMessages();
  const targetTabBtn = document.querySelector(`.auth-tab-btn[data-authtab="${defaultTab}"]`);
  if (targetTabBtn) targetTabBtn.click();
  authModal.showModal();
}
if (authOpenBtn) authOpenBtn.addEventListener("click", () => showAuthModal("cust-login"));

async function checkAuth() {
  try {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (data.success && data.authenticated && data.user) {
      currentUser = data.user;
    } else {
      currentUser = null;
    }
  } catch (err) {
    currentUser = null;
  }
  renderAuthUI();
}

function renderAuthUI() {
  if (!userInfoArea) return;

  if (currentUser) {
    const isAdmin = currentUser.role === "admin";
    userInfoArea.innerHTML = `
      <div class="user-pill">
        <span>👤 ${escapeHtml(currentUser.name)}</span>
        <span class="role-tag ${isAdmin ? 'admin' : ''}">${escapeHtml(currentUser.role)}</span>
        <button class="btn btn-outline btn-sm" id="logout-btn" style="padding: 3px 8px; font-size: .75rem;">Log Out</button>
      </div>
    `;
    document.getElementById("logout-btn").addEventListener("click", handleLogout);

    if (adminNavBtn) adminNavBtn.style.display = isAdmin ? "flex" : "none";
    if (customerBookingsCard) customerBookingsCard.style.display = "block";

    // Auto-fill reservation form if fields are empty
    const rName = document.getElementById("r-name");
    const rPhone = document.getElementById("r-phone");
    const rEmail = document.getElementById("r-email");
    if (rName && !rName.value) rName.value = currentUser.name || "";
    if (rPhone && !rPhone.value && currentUser.phone) rPhone.value = currentUser.phone;
    if (rEmail && !rEmail.value && currentUser.email) rEmail.value = currentUser.email;

  } else {
    userInfoArea.innerHTML = `<button class="btn btn-outline btn-sm" id="auth-open-btn">Sign In / Register</button>`;
    document.getElementById("auth-open-btn").addEventListener("click", () => showAuthModal("cust-login"));
    if (adminNavBtn) adminNavBtn.style.display = "none";
    if (customerBookingsCard) customerBookingsCard.style.display = "none";
  }

  // Refresh reviews and gallery to show/hide edit/delete permissions
  renderReviewsList();
  renderGalleryPhotos();
}

// Customer Login
document.getElementById("cust-login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("cl-email").value.trim();
  const password = document.getElementById("cl-password").value;
  const msgEl = document.getElementById("cl-msg");

  try {
    msgEl.textContent = "Signing in...";
    msgEl.className = "alert-msg";
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      msgEl.className = "alert-msg err";
      msgEl.textContent = data.message || "Login failed. Check your credentials.";
      return;
    }
    currentUser = data.user;
    renderAuthUI();
    authModal.close();
  } catch (err) {
    msgEl.className = "alert-msg err";
    msgEl.textContent = "Connection error. Please try again.";
  }
});

// Customer Register
document.getElementById("cust-register-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("cr-name").value.trim();
  const email = document.getElementById("cr-email").value.trim();
  const phone = document.getElementById("cr-phone").value.trim();
  const password = document.getElementById("cr-password").value;
  const msgEl = document.getElementById("cr-msg");

  try {
    msgEl.textContent = "Creating your account...";
    msgEl.className = "alert-msg";
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      msgEl.className = "alert-msg err";
      msgEl.textContent = data.message || "Registration failed.";
      return;
    }
    currentUser = data.user;
    renderAuthUI();
    authModal.close();
  } catch (err) {
    msgEl.className = "alert-msg err";
    msgEl.textContent = "Connection error. Please try again.";
  }
});

// Administrator Login
document.getElementById("admin-login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("al-email").value.trim();
  const password = document.getElementById("al-password").value;
  const msgEl = document.getElementById("al-msg");

  try {
    msgEl.textContent = "Authenticating administrator...";
    msgEl.className = "alert-msg";
    const res = await fetch("/api/auth/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      msgEl.className = "alert-msg err";
      msgEl.textContent = data.message || "Invalid administrator credentials.";
      return;
    }
    currentUser = data.user;
    renderAuthUI();
    authModal.close();
    showView("admin");
  } catch (err) {
    msgEl.className = "alert-msg err";
    msgEl.textContent = "Connection error. Please try again.";
  }
});

async function handleLogout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (e) {}
  currentUser = null;
  renderAuthUI();
  if (location.hash === "#admin") showView("explore");
}

/* ================= 4. DYNAMIC MENU DATA & FILTER ================= */
let allMenuItems = [];

async function loadMenu() {
  try {
    const res = await fetch("/api/menu");
    const data = await res.json();
    if (data.success && data.items) {
      allMenuItems = data.items;
      renderMenuBoard(data.grouped);
      const statDishes = document.getElementById("stat-dishes");
      if (statDishes) statDishes.textContent = data.items.length;
    }
  } catch (err) {
    console.error("Failed to load menu:", err);
  }
}

const CATEGORY_NAMES = {
  starter: "🥗 Starters & Appetizers",
  veg: "🥘 Main Course (Vegetarian)",
  nonveg: "🍗 Main Course (Non-Vegetarian)",
  rice: "🍚 Rice & Biryani",
  bread: "🫓 Breads (Tandoor)",
  dessert: "🍨 Desserts",
  drink: "🍹 Drinks & Beverages",
};

function renderMenuBoard(grouped) {
  const board = document.getElementById("menu-board");
  if (!board) return;
  board.innerHTML = "";

  const categories = ['starter', 'veg', 'nonveg', 'rice', 'bread', 'dessert', 'drink'];
  categories.forEach(cat => {
    const items = grouped[cat] || [];
    if (!items.length) return;

    const card = document.createElement("article");
    card.className = "card menu-cat";
    card.dataset.cat = cat;

    let itemsHtml = items.map(item => `
      <li>
        <span class="dot ${item.isVeg ? 'veg' : 'non'}"></span>
        <span class="n">${escapeHtml(item.name)}</span>
        <b>₹${item.price}</b>
      </li>
    `).join("");

    card.innerHTML = `<h3>${CATEGORY_NAMES[cat] || cat}</h3><ul>${itemsHtml}</ul>`;
    board.appendChild(card);
  });
}

// Menu Chip Filter
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    const filter = chip.dataset.filter;
    document.querySelectorAll("#menu-board .menu-cat").forEach(d => {
      d.hidden = filter !== "all" && d.dataset.cat !== filter;
    });
  });
});

/* ================= 5. DYNAMIC CHEFS DATA ================= */
let allChefs = [];

async function loadChefs() {
  try {
    const res = await fetch("/api/chefs");
    const data = await res.json();
    if (data.success && data.chefs) {
      allChefs = data.chefs;
      renderChefsGrid(data.chefs);
    }
  } catch (err) {
    console.error("Failed to load chefs:", err);
  }
}

function renderChefsGrid(chefs) {
  const grid = document.getElementById("chefs-grid");
  if (!grid) return;
  if (!chefs.length) {
    grid.innerHTML = '<p class="empty">Our culinary masters will be introduced shortly.</p>';
    return;
  }
  grid.innerHTML = chefs.map(chef => `
    <article class="card chef">
      <div class="avatar">${escapeHtml(chef.initials || "CH")}</div>
      <h3>${escapeHtml(chef.name)}</h3>
      <span class="label">${escapeHtml(chef.role)}</span>
      <p>${escapeHtml(chef.bio)}</p>
      <div class="chips">
        ${(chef.specialties || []).map(s => `<span>${escapeHtml(s)}</span>`).join("")}
      </div>
    </article>
  `).join("");
}

/* ================= 6. DYNAMIC REVIEWS & USER ACTIONS ================= */
let allReviews = [];
const reviewModal = document.getElementById("review-modal");
const writeReviewBtn = document.getElementById("write-review-btn");

window.openReviewModal = function(review = null) {
  // If not logged in, show auth dialog instead
  if (!currentUser) {
    showAuthModal("cust-login");
    return;
  }
  const modal = document.getElementById("review-modal");
  if (!modal) return;
  document.getElementById("rev-edit-id").value = review ? review._id : "";
  document.getElementById("rev-name").value = review ? review.authorName : (currentUser ? currentUser.name : "");
  document.getElementById("rev-rating").value = review ? review.rating : "5";
  document.getElementById("rev-comment").value = review ? review.comment : "";
  document.getElementById("review-modal-title").textContent = review ? "Edit Your Review" : "Write a Review";
  document.getElementById("rev-submit-btn").textContent = review ? "Save Changes" : "Submit Review";
  const msgEl = document.getElementById("rev-msg");
  if (msgEl) {
    msgEl.textContent = "";
    msgEl.className = "alert-msg";
  }
  if (typeof modal.showModal === "function") {
    modal.showModal();
  } else {
    modal.setAttribute("open", "true");
  }
};

if (writeReviewBtn) {
  writeReviewBtn.addEventListener("click", () => {
    openReviewModal();
  });
}

async function loadReviews() {
  try {
    const res = await fetch("/api/reviews");
    const data = await res.json();
    if (data.success && data.reviews) {
      allReviews = data.reviews;
      renderReviewsList();
    }
  } catch (err) {
    console.error("Failed to load reviews:", err);
  }
}

function renderReviewsList() {
  const grid = document.getElementById("reviews-grid");
  if (!grid) return;
  if (!allReviews.length) {
    grid.innerHTML = '<p class="empty">Be the first to share your dining experience at Saanjh!</p>';
    return;
  }

  grid.innerHTML = allReviews.map(r => {
    const isOwner = currentUser && (
      (r.user && (r.user === currentUser.id || (r.user._id && r.user._id === currentUser.id))) ||
      currentUser.role === 'admin'
    );
    const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);

    return `
      <article class="card review ${r.featured ? 'featured' : ''}" id="rev-card-${r._id}">
        <div class="stars">${stars}</div>
        <p>“${escapeHtml(r.comment)}”</p>
        <strong>${escapeHtml(r.authorName)}</strong>
        <span class="label">${escapeHtml(r.authorLabel || 'Guest')}</span>
        ${isOwner ? `
          <div class="review-actions">
            <button class="btn btn-outline btn-sm" onclick="editReview('${r._id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteReview('${r._id}')">Delete</button>
          </div>
        ` : ''}
      </article>
    `;
  }).join("");
}

window.editReview = function(id) {
  const rev = allReviews.find(r => r._id === id);
  if (rev) openReviewModal(rev);
};

window.deleteReview = async function(id) {
  if (!confirm("Are you sure you want to delete this review?")) return;
  try {
    const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok && data.success) {
      await loadReviews();
    } else {
      alert(data.message || "Could not delete review.");
    }
  } catch (err) {
    alert("Connection error while deleting review.");
  }
};

document.getElementById("review-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("rev-edit-id").value;
  const authorName = document.getElementById("rev-name").value.trim();
  const rating = document.getElementById("rev-rating").value;
  const comment = document.getElementById("rev-comment").value.trim();
  const msgEl = document.getElementById("rev-msg");

  const url = id ? `/api/reviews/${id}` : "/api/reviews";
  const method = id ? "PUT" : "POST";

  try {
    msgEl.textContent = "Saving review...";
    msgEl.className = "alert-msg";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName, rating, comment }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      msgEl.className = "alert-msg err";
      msgEl.textContent = data.message || "Failed to submit review.";
      return;
    }
    reviewModal.close();
    await loadReviews();
  } catch (err) {
    msgEl.className = "alert-msg err";
    msgEl.textContent = "Error saving review.";
  }
});

/* ================= 7. TABLE RESERVATIONS ================= */
const reserveForm = document.getElementById("reserve-form");
const formMsg = document.getElementById("form-msg");
const dateInput = document.getElementById("r-date");
const guestsInput = document.getElementById("r-guests");
const timeGrid = document.getElementById("time-grid");
const slotHelp = document.getElementById("slot-help");
const slotCount = document.getElementById("slot-count");

const pad = n => String(n).padStart(2, "0");
function localDateString(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

(function setupDatePicker() {
  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 30);
  if (dateInput) {
    dateInput.min = localDateString(today);
    dateInput.max = localDateString(maxDate);
    dateInput.value = localDateString(today);
  }
})();

if (dateInput) dateInput.addEventListener("change", () => { selectedSlot = null; renderSlots(); });
if (guestsInput) guestsInput.addEventListener("input", renderSlots);

async function renderSlots() {
  if (!dateInput || !timeGrid) return;
  const date = dateInput.value;
  const guests = guestsInput ? guestsInput.value : 2;

  timeGrid.innerHTML = "";
  if (!date) {
    slotHelp.textContent = "Pick a date to see available times.";
    if (slotCount) slotCount.textContent = "";
    return;
  }

  try {
    const res = await fetch(`/api/reservations/availability?date=${date}&guests=${guests}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      slotHelp.textContent = data.message || "Could not fetch slot availability.";
      return;
    }

    let available = 0;
    data.slots.forEach(s => {
      if (s.isAvailable) available++;
      if (!s.isAvailable && selectedSlot === s.slotMinutes) selectedSlot = null;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "time-btn" + (s.isLow ? " low" : "");
      btn.disabled = !s.isAvailable;
      btn.setAttribute("aria-pressed", String(selectedSlot === s.slotMinutes));
      btn.innerHTML = `${s.label}<small>${s.statusText}</small>`;
      btn.addEventListener("click", () => {
        selectedSlot = s.slotMinutes;
        renderSlots();
      });
      timeGrid.appendChild(btn);
    });

    if (slotCount) slotCount.textContent = `(${available} available)`;

    if (!available) {
      slotHelp.textContent = "No tables left for this date and group size. Please choose another day.";
    } else if (selectedSlot !== null) {
      const chosen = data.slots.find(s => s.slotMinutes === selectedSlot);
      slotHelp.textContent = chosen ? `Selected: ${chosen.label} to ${chosen.endLabel}` : "";
    } else {
      slotHelp.textContent = "Tap a time to select it. Each booking is for 1 hour. Greyed times are full or already passed.";
    }
  } catch (err) {
    slotHelp.textContent = "Could not connect to availability service.";
  }
}

function showBookingMessage(type, text, detail) {
  if (!formMsg) return;
  formMsg.className = type;
  formMsg.textContent = text;
  if (detail) {
    const small = document.createElement("small");
    small.className = "form-detail";
    small.textContent = detail;
    formMsg.appendChild(small);
  }
  if (formMsg.scrollIntoView) formMsg.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function handleBooking() {
  try {
    const customerName = document.getElementById("r-name").value.trim();
    const phone = document.getElementById("r-phone").value.trim();
    const email = document.getElementById("r-email").value.trim();
    const guests = Number(guestsInput.value);
    const date = dateInput.value;
    const specialRequests = document.getElementById("r-requests") ? document.getElementById("r-requests").value.trim() : "";

    if (!customerName) { showBookingMessage("err", "Please enter your name."); return; }
    if (!/^[0-9+ \-]{10,18}$/.test(phone)) { showBookingMessage("err", "Please enter a valid phone number (10 to 18 digits)."); return; }
    if (!date) { showBookingMessage("err", "Please choose a reservation date."); return; }
    if (!(guests >= 1 && guests <= 20)) { showBookingMessage("err", "Number of guests must be between 1 and 20."); return; }
    if (selectedSlot === null) { showBookingMessage("err", "Please tap a time slot above before confirming."); return; }

    showBookingMessage("", "Confirming your reservation...");
    const res = await fetch("/api/reservations/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        phone,
        email,
        date,
        timeSlot: selectedSlot,
        guests,
        specialRequests,
      }),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      showBookingMessage("err", data.message || "Sorry, booking could not be completed.");
      renderSlots();
      return;
    }

    const r = data.reservation;
    const prettyDate = new Date(date + "T00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    showBookingMessage("ok", "Your table reservation is confirmed!",
      `Table for ${r.guests} on ${prettyDate} at ${r.timeLabel}. Booking Reference: ${r.reservationId}. We look forward to welcoming you!`);

    selectedSlot = null;
    renderSlots();
  } catch (err) {
    showBookingMessage("err", "Something went wrong while booking. Please call us at +91 98765 43210.");
  }
}

const confirmBtn = document.getElementById("confirm-btn");
if (confirmBtn) confirmBtn.addEventListener("click", handleBooking);
if (reserveForm) reserveForm.addEventListener("submit", (e) => { e.preventDefault(); handleBooking(); });

/* ================= 8. CUSTOMER MY RESERVATIONS ================= */
const viewMyBookingsBtn = document.getElementById("view-my-bookings-btn");
const myBookingsModal = document.getElementById("my-bookings-modal");
const myBookingsList = document.getElementById("my-bookings-list");

if (viewMyBookingsBtn) {
  viewMyBookingsBtn.addEventListener("click", async () => {
    if (!currentUser) return;
    myBookingsModal.showModal();
    await loadCustomerBookings();
  });
}

async function loadCustomerBookings() {
  myBookingsList.innerHTML = '<p class="empty">Loading your bookings...</p>';
  try {
    const res = await fetch("/api/reservations/my-reservations");
    const data = await res.json();
    if (!res.ok || !data.success || !data.reservations.length) {
      myBookingsList.innerHTML = '<p class="empty">No reservations found for your account.</p>';
      return;
    }

    myBookingsList.innerHTML = data.reservations.map(r => `
      <article class="card" style="margin-bottom: 12px; padding: 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong>Ref: ${escapeHtml(r.reservationId)}</strong>
          <span class="status-pill ${r.status}">${escapeHtml(r.status)}</span>
        </div>
        <p style="margin: 8px 0 6px;">📅 ${escapeHtml(r.date)} at ${escapeHtml(r.timeLabel)} • ${r.guests} Guests</p>
        ${r.specialRequests ? `<p style="font-size:.85rem; color:var(--muted); margin-bottom:8px;">Special requests: ${escapeHtml(r.specialRequests)}</p>` : ''}
        ${r.status === 'confirmed' || r.status === 'pending' ? `
          <button class="btn btn-outline btn-sm" onclick="cancelMyReservation('${r._id}')">Cancel Booking</button>
        ` : ''}
      </article>
    `).join("");
  } catch (err) {
    myBookingsList.innerHTML = '<p class="empty">Failed to load reservations.</p>';
  }
}

window.cancelMyReservation = async function(id) {
  if (!confirm("Are you sure you want to cancel this reservation?")) return;
  try {
    const res = await fetch(`/api/reservations/my-reservations/${id}/cancel`, { method: "POST" });
    const data = await res.json();
    if (res.ok && data.success) {
      await loadCustomerBookings();
      renderSlots();
    } else {
      alert(data.message || "Failed to cancel reservation.");
    }
  } catch (err) {
    alert("Connection error.");
  }
};

/* ================= 9. PHOTO GALLERY ================= */
let galleryPhotos = [];
const photoInput = document.getElementById("photo-input");
const galleryGrid = document.getElementById("gallery-grid");
const galleryMsg = document.getElementById("gallery-msg");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const coverImg = document.getElementById("cover-img");

if (coverImg) coverImg.addEventListener("click", () => openLightbox(coverImg.src, coverImg.alt));
function openLightbox(src, alt) { lightboxImg.src = src; lightboxImg.alt = alt; lightbox.showModal(); }
if (lightbox) lightbox.addEventListener("click", () => lightbox.close());

async function loadGallery() {
  try {
    const res = await fetch("/api/gallery");
    const data = await res.json();
    if (data.success && data.images) {
      galleryPhotos = data.images;
      renderGalleryPhotos();
    }
  } catch (err) {
    console.error("Failed to load gallery:", err);
  }
}

function renderGalleryPhotos() {
  if (!galleryGrid) return;
  galleryGrid.innerHTML = "";

  galleryPhotos.forEach(p => {
    const fig = document.createElement("figure");
    fig.className = "gal-item";
    const img = document.createElement("img");
    img.src = p.imageUrl;
    img.alt = p.caption || "Restaurant photo";
    img.addEventListener("click", () => openLightbox(p.imageUrl, p.caption));
    fig.appendChild(img);

    const isUploader = currentUser && (
      (p.uploadedBy && (p.uploadedBy === currentUser.id || (p.uploadedBy._id && p.uploadedBy._id === currentUser.id))) ||
      currentUser.role === 'admin'
    );

    if (isUploader) {
      const del = document.createElement("button");
      del.className = "gal-del";
      del.type = "button";
      del.textContent = "×";
      del.setAttribute("aria-label", "Delete photo");
      let armTimer = null;
      del.addEventListener("click", async () => {
        if (!del.classList.contains("armed")) {
          del.classList.add("armed"); del.textContent = "Delete?";
          armTimer = setTimeout(() => { del.classList.remove("armed"); del.textContent = "×"; }, 3000);
          return;
        }
        clearTimeout(armTimer);
        await deletePhoto(p._id);
      });
      fig.appendChild(del);
    }

    galleryGrid.appendChild(fig);
  });

  // Add upload slot box
  const slot = document.createElement("button");
  slot.type = "button";
  slot.className = "gal-item slot";
  slot.textContent = "+ Add photo";
  slot.addEventListener("click", () => {
    if (!currentUser) {
      showAuthModal("cust-login");
      return;
    }
    photoInput.click();
  });
  galleryGrid.appendChild(slot);
}

async function deletePhoto(id) {
  try {
    const res = await fetch(`/api/gallery/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok && data.success) {
      await loadGallery();
      if (currentUser && currentUser.role === "admin") loadAdminGallery();
    } else {
      alert(data.message || "Could not delete photo.");
    }
  } catch (err) {
    alert("Connection error.");
  }
}

if (photoInput) {
  photoInput.addEventListener("change", async () => {
    if (!currentUser) {
      showAuthModal("cust-login");
      return;
    }
    const files = [...photoInput.files];
    if (!files.length) return;

    const formData = new FormData();
    files.forEach(f => formData.append("photos", f));

    galleryMsg.textContent = `Uploading ${files.length} photo(s)...`;
    try {
      const res = await fetch("/api/gallery/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        galleryMsg.textContent = `${files.length} photo(s) uploaded successfully!`;
        await loadGallery();
      } else {
        galleryMsg.textContent = data.message || "Failed to upload photos.";
      }
    } catch (err) {
      galleryMsg.textContent = "Error uploading photos.";
    }
    photoInput.value = "";
  });
}

/* ================= 10. ADMINISTRATOR DASHBOARD ================= */
// Admin Tab Switching
document.querySelectorAll(".admin-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeAdminTab = btn.dataset.tab;
    document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
    const target = document.getElementById("tab-" + activeAdminTab);
    if (target) target.classList.add("active");
    loadAdminTab(activeAdminTab);
  });
});

function loadAdminTab(tab) {
  if (!currentUser || currentUser.role !== "admin") return;
  switch (tab) {
    case "admin-reservations": loadAdminReservations(); break;
    case "admin-menu": loadAdminMenu(); break;
    case "admin-chefs": loadAdminChefs(); break;
    case "admin-reviews": loadAdminReviews(); break;
    case "admin-gallery": loadAdminGallery(); break;
    case "admin-settings": loadAdminSettings(); break;
  }
}

// 1. Admin Reservations
const refreshResBtn = document.getElementById("refresh-reservations-btn");
if (refreshResBtn) refreshResBtn.addEventListener("click", loadAdminReservations);
const applyResFilterBtn = document.getElementById("apply-res-filter-btn");
if (applyResFilterBtn) applyResFilterBtn.addEventListener("click", loadAdminReservations);

async function loadAdminReservations() {
  const tbody = document.getElementById("admin-reservations-body");
  if (!tbody) return;

  const status = document.getElementById("res-status-filter").value;
  const search = document.getElementById("res-search").value.trim();
  const date = document.getElementById("res-date-filter").value;

  const params = new URLSearchParams();
  if (status && status !== 'all') params.append("status", status);
  if (search) params.append("search", search);
  if (date) params.append("date", date);

  try {
    const res = await fetch(`/api/reservations/admin/all?${params.toString()}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty">${data.message || 'Error loading reservations'}</td></tr>`;
      return;
    }

    // Update counters
    document.getElementById("stat-total-res").textContent = data.summary.total;
    document.getElementById("stat-conf-res").textContent = data.summary.confirmed;
    document.getElementById("stat-pend-res").textContent = data.summary.pending;
    document.getElementById("stat-canc-res").textContent = data.summary.cancelled;

    if (!data.reservations.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty">No reservations found matching criteria.</td></tr>';
      return;
    }

    tbody.innerHTML = data.reservations.map(r => `
      <tr>
        <td><strong>${escapeHtml(r.reservationId)}</strong></td>
        <td>${escapeHtml(r.customerName)}</td>
        <td>${escapeHtml(r.phone)}</td>
        <td>${escapeHtml(r.date)}</td>
        <td>${escapeHtml(r.timeLabel)}</td>
        <td>${r.guests}</td>
        <td><span class="status-pill ${r.status}">${escapeHtml(r.status)}</span></td>
        <td>
          <select onchange="updateAdminResStatus('${r._id}', this.value)" style="padding: 4px; font-size:.8rem;">
            <option value="confirmed" ${r.status === 'confirmed' ? 'selected' : ''}>Confirm</option>
            <option value="completed" ${r.status === 'completed' ? 'selected' : ''}>Complete</option>
            <option value="cancelled" ${r.status === 'cancelled' ? 'selected' : ''}>Cancel</option>
            <option value="pending" ${r.status === 'pending' ? 'selected' : ''}>Pending</option>
          </select>
          <button class="btn btn-danger btn-sm" onclick="deleteAdminRes('${r._id}')">Delete</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty">Connection error while loading reservations.</td></tr>';
  }
}

window.updateAdminResStatus = async function(id, status) {
  try {
    const res = await fetch(`/api/reservations/admin/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      loadAdminReservations();
      renderSlots();
    } else {
      alert(data.message || "Failed to update reservation status.");
    }
  } catch (err) {
    alert("Connection error.");
  }
};

window.deleteAdminRes = async function(id) {
  if (!confirm("Are you sure you want to delete this reservation?")) return;
  try {
    const res = await fetch(`/api/reservations/admin/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok && data.success) {
      loadAdminReservations();
      renderSlots();
    } else {
      alert(data.message || "Failed to delete reservation.");
    }
  } catch (err) {
    alert("Connection error.");
  }
};

// 2. Admin Menu Management
const dishModal = document.getElementById("dish-modal");
const addDishBtn = document.getElementById("add-dish-btn");
if (addDishBtn) {
  addDishBtn.addEventListener("click", () => {
    document.getElementById("dish-edit-id").value = "";
    document.getElementById("dish-name").value = "";
    document.getElementById("dish-price").value = "";
    document.getElementById("dish-cat").value = "starter";
    document.getElementById("dish-isveg").checked = true;
    document.getElementById("dish-avail").checked = true;
    document.getElementById("dish-desc").value = "";
    document.getElementById("dish-modal-title").textContent = "Add Menu Dish";
    document.getElementById("dish-msg").textContent = "";
    dishModal.showModal();
  });
}

async function loadAdminMenu() {
  const tbody = document.getElementById("admin-menu-body");
  if (!tbody) return;
  try {
    const res = await fetch("/api/menu");
    const data = await res.json();
    if (!res.ok || !data.success || !data.items.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">No menu items found.</td></tr>';
      return;
    }
    tbody.innerHTML = data.items.map(d => `
      <tr>
        <td><span class="dot ${d.isVeg ? 'veg' : 'non'}"></span></td>
        <td><strong>${escapeHtml(d.name)}</strong></td>
        <td>${escapeHtml(CATEGORY_NAMES[d.category] || d.category)}</td>
        <td>₹${d.price}</td>
        <td>${d.isAvailable ? '✅ Yes' : '❌ Out of stock'}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="editDish('${d._id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteDish('${d._id}')">Delete</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Failed to load menu items.</td></tr>';
  }
}

window.editDish = function(id) {
  const d = allMenuItems.find(i => i._id === id);
  if (!d) return;
  document.getElementById("dish-edit-id").value = d._id;
  document.getElementById("dish-name").value = d.name;
  document.getElementById("dish-price").value = d.price;
  document.getElementById("dish-cat").value = d.category;
  document.getElementById("dish-isveg").checked = d.isVeg;
  document.getElementById("dish-avail").checked = d.isAvailable;
  document.getElementById("dish-desc").value = d.description || "";
  document.getElementById("dish-modal-title").textContent = "Edit Menu Dish";
  document.getElementById("dish-msg").textContent = "";
  dishModal.showModal();
};

window.deleteDish = async function(id) {
  if (!confirm("Are you sure you want to delete this dish?")) return;
  try {
    const res = await fetch(`/api/menu/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok && data.success) {
      await loadMenu();
      loadAdminMenu();
    } else {
      alert(data.message || "Failed to delete dish.");
    }
  } catch (err) {
    alert("Connection error.");
  }
};

document.getElementById("dish-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("dish-edit-id").value;
  const name = document.getElementById("dish-name").value.trim();
  const price = parseFloat(document.getElementById("dish-price").value);
  const category = document.getElementById("dish-cat").value;
  const isVeg = document.getElementById("dish-isveg").checked;
  const isAvailable = document.getElementById("dish-avail").checked;
  const description = document.getElementById("dish-desc").value.trim();
  const msgEl = document.getElementById("dish-msg");

  const url = id ? `/api/menu/${id}` : "/api/menu";
  const method = id ? "PUT" : "POST";

  try {
    msgEl.textContent = "Saving dish...";
    msgEl.className = "alert-msg";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price, category, isVeg, isAvailable, description }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      msgEl.className = "alert-msg err";
      msgEl.textContent = data.message || "Failed to save dish.";
      return;
    }
    dishModal.close();
    await loadMenu();
    loadAdminMenu();
  } catch (err) {
    msgEl.className = "alert-msg err";
    msgEl.textContent = "Error saving dish.";
  }
});

// 3. Admin Chefs Management
const chefModal = document.getElementById("chef-modal");
const addChefBtn = document.getElementById("add-chef-btn");
if (addChefBtn) {
  addChefBtn.addEventListener("click", () => {
    document.getElementById("chef-edit-id").value = "";
    document.getElementById("chef-name").value = "";
    document.getElementById("chef-role").value = "";
    document.getElementById("chef-initials").value = "";
    document.getElementById("chef-specs").value = "";
    document.getElementById("chef-bio").value = "";
    document.getElementById("chef-modal-title").textContent = "Add Chef Profile";
    document.getElementById("chef-msg").textContent = "";
    chefModal.showModal();
  });
}

async function loadAdminChefs() {
  const tbody = document.getElementById("admin-chefs-body");
  if (!tbody) return;
  try {
    const res = await fetch("/api/chefs");
    const data = await res.json();
    if (!res.ok || !data.success || !data.chefs.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">No chefs found.</td></tr>';
      return;
    }
    tbody.innerHTML = data.chefs.map(c => `
      <tr>
        <td><div class="avatar" style="width:36px;height:36px;font-size:.9rem;margin:0;">${escapeHtml(c.initials || "CH")}</div></td>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td>${escapeHtml(c.role)}</td>
        <td>${(c.specialties || []).map(s => escapeHtml(s)).join(", ")}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="editChef('${c._id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteChef('${c._id}')">Delete</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Failed to load chefs.</td></tr>';
  }
}

window.editChef = function(id) {
  const c = allChefs.find(i => i._id === id);
  if (!c) return;
  document.getElementById("chef-edit-id").value = c._id;
  document.getElementById("chef-name").value = c.name;
  document.getElementById("chef-role").value = c.role;
  document.getElementById("chef-initials").value = c.initials || "";
  document.getElementById("chef-specs").value = (c.specialties || []).join(", ");
  document.getElementById("chef-bio").value = c.bio;
  document.getElementById("chef-modal-title").textContent = "Edit Chef Profile";
  document.getElementById("chef-msg").textContent = "";
  chefModal.showModal();
};

window.deleteChef = async function(id) {
  if (!confirm("Are you sure you want to delete this chef?")) return;
  try {
    const res = await fetch(`/api/chefs/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok && data.success) {
      await loadChefs();
      loadAdminChefs();
    } else {
      alert(data.message || "Failed to delete chef.");
    }
  } catch (err) {
    alert("Connection error.");
  }
};

document.getElementById("chef-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("chef-edit-id").value;
  const name = document.getElementById("chef-name").value.trim();
  const role = document.getElementById("chef-role").value.trim();
  const initials = document.getElementById("chef-initials").value.trim();
  const specialties = document.getElementById("chef-specs").value.split(",").map(s => s.trim()).filter(Boolean);
  const bio = document.getElementById("chef-bio").value.trim();
  const msgEl = document.getElementById("chef-msg");

  const url = id ? `/api/chefs/${id}` : "/api/chefs";
  const method = id ? "PUT" : "POST";

  try {
    msgEl.textContent = "Saving chef...";
    msgEl.className = "alert-msg";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, initials, specialties, bio }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      msgEl.className = "alert-msg err";
      msgEl.textContent = data.message || "Failed to save chef.";
      return;
    }
    chefModal.close();
    await loadChefs();
    loadAdminChefs();
  } catch (err) {
    msgEl.className = "alert-msg err";
    msgEl.textContent = "Error saving chef.";
  }
});

// 4. Admin Review Moderation
const refreshReviewsBtn = document.getElementById("refresh-reviews-btn");
if (refreshReviewsBtn) refreshReviewsBtn.addEventListener("click", loadAdminReviews);

async function loadAdminReviews() {
  const tbody = document.getElementById("admin-reviews-body");
  if (!tbody) return;
  try {
    const res = await fetch("/api/reviews/admin/all");
    const data = await res.json();
    if (!res.ok || !data.success || !data.reviews.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">No reviews in database.</td></tr>';
      return;
    }
    tbody.innerHTML = data.reviews.map(r => `
      <tr>
        <td><strong style="color:var(--orange);">★ ${r.rating}</strong></td>
        <td>${escapeHtml(r.authorName)}</td>
        <td>${escapeHtml(r.authorLabel || 'Guest')}</td>
        <td style="max-width:300px;">“${escapeHtml(r.comment)}”</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="toggleAdminReviewFeatured('${r._id}', ${!r.featured})">
            ${r.featured ? '⭐ Featured' : '☆ Normal'}
          </button>
        </td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteAdminReview('${r._id}')">Remove</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Failed to load reviews.</td></tr>';
  }
}

window.toggleAdminReviewFeatured = async function(id, featured) {
  try {
    const res = await fetch(`/api/reviews/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured }),
    });
    if (res.ok) {
      loadAdminReviews();
      loadReviews();
    }
  } catch (e) {}
};

window.deleteAdminReview = async function(id) {
  if (!confirm("Are you sure you want to remove this review?")) return;
  try {
    const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadAdminReviews();
      loadReviews();
    }
  } catch (e) {}
};

// 5. Admin Gallery Management
const adminPhotoInput = document.getElementById("admin-photo-input");
if (adminPhotoInput) {
  adminPhotoInput.addEventListener("change", async () => {
    const files = [...adminPhotoInput.files];
    if (!files.length) return;
    const formData = new FormData();
    files.forEach(f => formData.append("photos", f));

    try {
      const res = await fetch("/api/gallery/upload", { method: "POST", body: formData });
      if (res.ok) {
        await loadGallery();
        loadAdminGallery();
      }
    } catch (e) {}
    adminPhotoInput.value = "";
  });
}

function loadAdminGallery() {
  const grid = document.getElementById("admin-gallery-grid");
  if (!grid) return;
  grid.innerHTML = "";

  galleryPhotos.forEach(p => {
    const fig = document.createElement("figure");
    fig.className = "gal-item";
    const img = document.createElement("img");
    img.src = p.imageUrl;
    img.alt = p.caption || "Gallery photo";
    img.addEventListener("click", () => openLightbox(p.imageUrl, p.caption));
    fig.appendChild(img);

    const meta = document.createElement("div");
    meta.className = "gal-meta";
    meta.textContent = `${p.uploaderName || 'Guest'} • ${new Date(p.createdAt || Date.now()).toLocaleDateString()}`;
    fig.appendChild(meta);

    const del = document.createElement("button");
    del.className = "gal-del";
    del.type = "button";
    del.textContent = "×";
    del.addEventListener("click", () => deletePhoto(p._id));
    fig.appendChild(del);

    grid.appendChild(fig);
  });
}

// 6. Admin Settings
async function loadAdminSettings() {
  try {
    const res = await fetch("/api/settings");
    const data = await res.json();
    if (data.success && data.settings) {
      currentSettings = data.settings;
      document.getElementById("set-name").value = data.settings.restaurantName || "Saanjh";
      document.getElementById("set-tagline").value = data.settings.tagline || "";
      document.getElementById("set-phone").value = data.settings.phone || "";
      document.getElementById("set-email").value = data.settings.email || "";
      document.getElementById("set-address").value = data.settings.address || "";
      document.getElementById("set-hours").value = data.settings.openHoursText || "";
      document.getElementById("set-tables").value = data.settings.tablesPerSlot || 6;
      document.getElementById("set-guests").value = data.settings.guestsPerTable || 4;

      // Update public display text
      updatePublicSettings(data.settings);
    }
  } catch (err) {
    console.error("Failed to load settings:", err);
  }
}

function updatePublicSettings(s) {
  if (s.phone) {
    const sidePhone = document.getElementById("side-phone");
    if (sidePhone) { sidePhone.textContent = s.phone; sidePhone.href = "tel:" + s.phone.replace(/[^0-9+]/g, ""); }
    const cardPhone = document.getElementById("card-phone");
    if (cardPhone) { cardPhone.textContent = s.phone; cardPhone.href = "tel:" + s.phone.replace(/[^0-9+]/g, ""); }
    const infoPhone = document.getElementById("info-phone");
    if (infoPhone) { infoPhone.textContent = s.phone; infoPhone.href = "tel:" + s.phone.replace(/[^0-9+]/g, ""); }
  }
  if (s.email) {
    const cardEmail = document.getElementById("card-email");
    if (cardEmail) { cardEmail.textContent = s.email; cardEmail.href = "mailto:" + s.email; }
    const infoEmail = document.getElementById("info-email");
    if (infoEmail) { infoEmail.textContent = s.email; infoEmail.href = "mailto:" + s.email; }
  }
  if (s.address) {
    const cardAddr = document.getElementById("card-address");
    if (cardAddr) cardAddr.textContent = s.address;
    const infoAddr = document.getElementById("info-address");
    if (infoAddr) infoAddr.textContent = s.address;
    const mapAddr = document.getElementById("map-address-text");
    if (mapAddr) mapAddr.textContent = s.address;
  }
  if (s.openHoursText) {
    const sideHours = document.getElementById("side-hours");
    if (sideHours) sideHours.textContent = s.openHoursText;
    const cardHours = document.getElementById("card-hours");
    if (cardHours) cardHours.textContent = s.openHoursText;
    const infoHours = document.getElementById("info-hours");
    if (infoHours) infoHours.textContent = s.openHoursText;
  }
  if (s.tagline) {
    const coverTag = document.getElementById("cover-tagline");
    if (coverTag) coverTag.textContent = s.tagline;
  }
  if (s.openHour) updateOpenBadge(s.openHour, s.lastSeatingHour + 1.5);
}

const adminSettingsForm = document.getElementById("admin-settings-form");
if (adminSettingsForm) {
  adminSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      restaurantName: document.getElementById("set-name").value.trim(),
      tagline: document.getElementById("set-tagline").value.trim(),
      phone: document.getElementById("set-phone").value.trim(),
      email: document.getElementById("set-email").value.trim(),
      address: document.getElementById("set-address").value.trim(),
      openHoursText: document.getElementById("set-hours").value.trim(),
      tablesPerSlot: parseInt(document.getElementById("set-tables").value, 10),
      guestsPerTable: parseInt(document.getElementById("set-guests").value, 10),
    };

    const msgEl = document.getElementById("settings-msg");
    msgEl.textContent = "Saving settings...";
    msgEl.className = "alert-msg";

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        msgEl.className = "alert-msg ok";
        msgEl.textContent = "Restaurant settings updated successfully!";
        updatePublicSettings(data.settings);
        renderSlots();
      } else {
        msgEl.className = "alert-msg err";
        msgEl.textContent = data.message || "Failed to update settings.";
      }
    } catch (err) {
      msgEl.className = "alert-msg err";
      msgEl.textContent = "Connection error while updating settings.";
    }
  });
}

/* ================= 11. LIVE MAP: Leaflet + Routing Machine ================= */
(function setupLiveMap() {
  const distanceEl = document.getElementById("distance");
  const durationEl = document.getElementById("duration");
  const statusText = document.getElementById("map-status");
  const hintText = document.getElementById("map-hint");
  const startBtn = document.getElementById("start-location-btn");
  const stopBtn = document.getElementById("stop-location-btn");

  if (typeof L === "undefined" || !L.Routing) {
    if (statusText) statusText.textContent = "Map libraries failed to load. Check your internet connection.";
    return;
  }

  const restaurantName = "Saanjh";
  const restaurantLocation = L.latLng(23.3768, 85.2974);
  const OSRM_URL = "https://router.project-osrm.org/route/v1";
  const ROUTE_INTERVAL_MS = 30000;
  const MIN_MOVEMENT_M = 50;

  const mapEl = document.getElementById("map");
  if (!mapEl) return;

  const map = L.map("map").setView(restaurantLocation, 15);
  window.map = map;

  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: 'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> &mdash; Source: Esri, HERE, Garmin, USGS'
  }).addTo(map);

  map.whenReady(() => setTimeout(() => map.invalidateSize(), 200));

  const restaurantIcon = L.divIcon({
    className: "custom-marker",
    html: '<div style="width:42px;height:42px;display:grid;place-items:center;border:4px solid #fff8ea;border-radius:50%;background:#ff6b1a;font-size:19px;box-shadow:0 5px 15px rgba(0,0,0,.25)">🍴</div>',
    iconSize: [42, 42], iconAnchor: [21, 21], popupAnchor: [0, -20]
  });

  L.marker(restaurantLocation, { icon: restaurantIcon })
    .addTo(map)
    .bindTooltip(restaurantName)
    .bindPopup(`<strong>${restaurantName}</strong><br>Near Pandra, Ranchi`, { minWidth: 150 })
    .openPopup();

  let userMarker = null;
  let accuracyCircle = null;
  let routingControl = null;
  let lastRouteLocation = null;
  let lastRouteTime = 0;
  let routing = false;
  let watchId = null;
  let hasRealFix = false;
  let triedLowAccuracy = false;

  function formatTime(seconds) {
    const total = Math.max(1, Math.ceil(seconds / 60));
    if (total < 60) return `${total} min`;
    const h = Math.floor(total / 60), m = total % 60;
    return m ? `${h} hr ${m} min` : `${h} hr`;
  }
  function formatDistance(metres) {
    return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
  }

  function setupRoutingControl() {
    if (routingControl) return;
    routingControl = L.Routing.control({
      waypoints: [],
      router: L.Routing.osrmv1({ serviceUrl: OSRM_URL, profile: "car", timeout: 10000 }),
      lineOptions: { styles: [{ color: "#ff6b1a", opacity: 0.85, weight: 6 }] },
      addWaypoints: false, draggableWaypoints: false, fitSelectedRoutes: false, show: false, createMarker: () => null
    }).addTo(map);

    routingControl.on("routesfound", e => {
      const route = e.routes[0];
      distanceEl.textContent = formatDistance(route.summary.totalDistance);
      durationEl.textContent = formatTime(route.summary.totalTime);
      hintText.textContent = "Route updated for current traffic.";
    });
    routingControl.on("routingerror", () => {
      if (lastRouteLocation) {
        const straight = lastRouteLocation.distanceTo(restaurantLocation);
        distanceEl.textContent = formatDistance(straight) + " (straight line)";
        durationEl.textContent = formatTime(straight / 8.3);
      }
    });
  }

  function updateRoute(userLatLng, force = false) {
    setupRoutingControl();
    const now = Date.now();
    const moved = !lastRouteLocation || lastRouteLocation.distanceTo(userLatLng) >= MIN_MOVEMENT_M;
    const waited = now - lastRouteTime >= ROUTE_INTERVAL_MS;
    if (!force && !(moved && waited)) return;
    lastRouteLocation = userLatLng;
    lastRouteTime = now;
    routingControl.setWaypoints([userLatLng, restaurantLocation]);
  }

  function onLocationSuccess(pos) {
    const lat = pos.coords.latitude, lng = pos.coords.longitude, acc = pos.coords.accuracy;
    const userLatLng = L.latLng(lat, lng);
    hasRealFix = true;

    if (!userMarker) {
      const userIcon = L.divIcon({
        className: "custom-marker",
        html: '<div style="width:18px;height:18px;border-radius:50%;background:#0d6efd;border:3px solid #fff;box-shadow:0 0 0 3px rgba(13,110,253,.35)"></div>',
        iconSize: [18, 18], iconAnchor: [9, 9]
      });
      userMarker = L.marker(userLatLng, { icon: userIcon }).addTo(map).bindPopup("You are here");
      accuracyCircle = L.circle(userLatLng, { radius: acc, color: "#0d6efd", fillOpacity: 0.12, weight: 1 }).addTo(map);
      map.fitBounds(L.latLngBounds([userLatLng, restaurantLocation]).pad(0.2));
      updateRoute(userLatLng, true);
    } else {
      userMarker.setLatLng(userLatLng);
      accuracyCircle.setLatLng(userLatLng);
      accuracyCircle.setRadius(acc);
      updateRoute(userLatLng, false);
    }
    statusText.textContent = "Tracking active.";
  }

  function onLocationError(err) {
    if (err.code === 3 && !triedLowAccuracy) {
      triedLowAccuracy = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      watchId = navigator.geolocation.watchPosition(onLocationSuccess, onLocationError, {
        enableHighAccuracy: false, timeout: 20000, maximumAge: 30000
      });
      return;
    }
    statusText.textContent = err.code === 1 ? "Location permission was denied." : "Could not determine location.";
    stopTracking();
  }

  function startTracking() {
    if (!navigator.geolocation) { statusText.textContent = "Geolocation is not supported by your browser."; return; }
    routing = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusText.textContent = "Locating you...";
    watchId = navigator.geolocation.watchPosition(onLocationSuccess, onLocationError, {
      enableHighAccuracy: true, timeout: 12000, maximumAge: 5000
    });
  }

  function stopTracking() {
    routing = false;
    if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusText.textContent = "Tracking stopped.";
  }

  startBtn.addEventListener("click", startTracking);
  stopBtn.addEventListener("click", stopTracking);
})();

/* ================= 12. HELPER UTILS ================= */
function escapeHtml(str) {
  if (typeof str !== 'string') return str || '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[m]);
}

// Close dialogs when clicking backdrop outside modal box
document.querySelectorAll("dialog").forEach(dialog => {
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
});

/* ================= 13. INITIALIZATION ================= */
(async function init() {
  updateOpenBadge();
  await checkAuth();
  await loadAdminSettings();
  await Promise.all([
    loadMenu(),
    loadChefs(),
    loadReviews(),
    loadGallery(),
    renderSlots(),
  ]);

  // Handle URL hash on load (e.g. #menu or #admin)
  const initialHash = location.hash.replace("#", "");
  if (initialHash && document.getElementById(initialHash)) {
    showView(initialHash);
  }
})();
