const Reservation = require('../models/Reservation');
const RestaurantSettings = require('../models/RestaurantSettings');
const {
  pad,
  timeLabel,
  localDateString,
  generateReservationId,
  getAllSlots,
  isSlotInPast,
} = require('../utils/slotHelper');

// GET /api/reservations/availability?date=YYYY-MM-DD&guests=2
async function getAvailability(req, res, next) {
  try {
    const { date, guests } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Valid date query parameter (YYYY-MM-DD) is required.',
      });
    }

    const settings = await RestaurantSettings.getSettings();
    const guestCount = Math.max(1, Math.min(20, parseInt(guests, 10) || 2));
    const tablesNeeded = Math.ceil(guestCount / settings.guestsPerTable);

    const slots = getAllSlots(settings.openHour, settings.lastSeatingHour, settings.slotMinutes);

    // Fetch existing active reservations for this date
    const existing = await Reservation.find({
      date,
      status: { $in: ['confirmed', 'pending'] },
    }).select('timeSlot tablesCount');

    // Aggregate tables booked per slot
    const bookedMap = {};
    existing.forEach((r) => {
      bookedMap[r.timeSlot] = (bookedMap[r.timeSlot] || 0) + (r.tablesCount || 1);
    });

    const slotDetails = slots.map((min) => {
      const past = isSlotInPast(date, min);
      const booked = bookedMap[min] || 0;
      const left = Math.max(0, settings.tablesPerSlot - booked);
      const available = !past && left >= tablesNeeded;

      let labelState = 'Available';
      if (past) labelState = 'Passed';
      else if (!available) labelState = 'Full';
      else if (left <= 2) labelState = `Only ${left} left`;

      return {
        slotMinutes: min,
        label: timeLabel(min),
        endLabel: timeLabel(min + settings.slotMinutes),
        tablesTotal: settings.tablesPerSlot,
        tablesBooked: booked,
        tablesLeft: left,
        isPast: past,
        isAvailable: available,
        statusText: labelState,
        isLow: available && left <= 2,
      };
    });

    const availableCount = slotDetails.filter((s) => s.isAvailable).length;

    return res.json({
      success: true,
      date,
      guests: guestCount,
      tablesNeeded,
      availableSlotsCount: availableCount,
      slots: slotDetails,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/reservations/book
async function createReservation(req, res, next) {
  try {
    const { customerName, phone, email, date, timeSlot, guests, specialRequests } = req.body;
    const settings = await RestaurantSettings.getSettings();

    const parsedSlot = parseInt(timeSlot, 10);
    const parsedGuests = parseInt(guests, 10);

    // Validate date is not past
    const todayStr = localDateString(new Date());
    if (date < todayStr) {
      return res.status(400).json({
        success: false,
        message: 'Reservations cannot be made for past dates.',
      });
    }

    // Check if slot has passed
    if (isSlotInPast(date, parsedSlot)) {
      return res.status(400).json({
        success: false,
        message: 'This time slot has already passed or is within 30 minutes. Please select a later time.',
      });
    }

    const tablesNeeded = Math.ceil(parsedGuests / settings.guestsPerTable);

    // Slot capacity check before saving
    const existing = await Reservation.find({
      date,
      timeSlot: parsedSlot,
      status: { $in: ['confirmed', 'pending'] },
    });

    const currentBookedTables = existing.reduce((sum, r) => sum + (r.tablesCount || 1), 0);
    const tablesLeft = settings.tablesPerSlot - currentBookedTables;

    if (tablesLeft < tablesNeeded) {
      return res.status(409).json({
        success: false,
        message: 'Sorry, this time slot has just reached full capacity. Please select another time.',
      });
    }

    // Generate unique reservation ID
    let uniqueId = generateReservationId();
    let collision = await Reservation.findOne({ reservationId: uniqueId });
    while (collision) {
      uniqueId = generateReservationId();
      collision = await Reservation.findOne({ reservationId: uniqueId });
    }

    const reservation = await Reservation.create({
      reservationId: uniqueId,
      user: req.session && req.session.userId ? req.session.userId : null,
      customerName: customerName.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      date,
      timeSlot: parsedSlot,
      timeLabel: timeLabel(parsedSlot),
      guests: parsedGuests,
      tablesCount: tablesNeeded,
      specialRequests: specialRequests ? specialRequests.trim() : '',
      status: 'confirmed',
    });

    return res.status(201).json({
      success: true,
      message: 'Reservation confirmed successfully!',
      reservation: {
        id: reservation._id,
        reservationId: reservation.reservationId,
        customerName: reservation.customerName,
        phone: reservation.phone,
        date: reservation.date,
        timeLabel: reservation.timeLabel,
        guests: reservation.guests,
        status: reservation.status,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/reservations/my-reservations (for logged-in customer)
async function getMyReservations(req, res, next) {
  try {
    const reservations = await Reservation.find({ user: req.user._id })
      .sort({ date: -1, timeSlot: -1 })
      .lean();

    return res.json({
      success: true,
      reservations,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/reservations/my-reservations/:id/cancel
async function cancelMyReservation(req, res, next) {
  try {
    const reservation = await Reservation.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found or unauthorized.',
      });
    }

    reservation.status = 'cancelled';
    await reservation.save();

    return res.json({
      success: true,
      message: 'Your reservation has been cancelled.',
      reservation,
    });
  } catch (err) {
    next(err);
  }
}

// ADMIN: GET /api/admin/reservations
async function getAllReservationsAdmin(req, res, next) {
  try {
    const { status, search, date } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }
    if (date) {
      query.date = date;
    }
    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { customerName: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
        { reservationId: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ];
    }

    const reservations = await Reservation.find(query)
      .populate('user', 'name email')
      .sort({ date: 1, timeSlot: 1, createdAt: -1 })
      .lean();

    // Summary metrics for admin header
    const totalCount = await Reservation.countDocuments();
    const confirmedCount = await Reservation.countDocuments({ status: 'confirmed' });
    const pendingCount = await Reservation.countDocuments({ status: 'pending' });
    const cancelledCount = await Reservation.countDocuments({ status: 'cancelled' });

    return res.json({
      success: true,
      summary: {
        total: totalCount,
        confirmed: confirmedCount,
        pending: pendingCount,
        cancelled: cancelledCount,
      },
      reservations,
    });
  } catch (err) {
    next(err);
  }
}

// ADMIN: PATCH /api/admin/reservations/:id/status
async function updateReservationStatusAdmin(req, res, next) {
  try {
    const { status } = req.body;
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reservation status.',
      });
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation record not found.',
      });
    }

    reservation.status = status;
    await reservation.save();

    return res.json({
      success: true,
      message: `Reservation status updated to ${status}.`,
      reservation,
    });
  } catch (err) {
    next(err);
  }
}

// ADMIN: DELETE /api/admin/reservations/:id
async function deleteReservationAdmin(req, res, next) {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation record not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Reservation deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAvailability,
  createReservation,
  getMyReservations,
  cancelMyReservation,
  getAllReservationsAdmin,
  updateReservationStatusAdmin,
  deleteReservationAdmin,
};
