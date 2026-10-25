const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    reservationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[0-9+\- ]{10,18}$/, 'Please provide a valid phone number (10 to 18 digits)'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    date: {
      type: String,
      required: [true, 'Reservation date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    timeSlot: {
      type: Number,
      required: [true, 'Time slot is required'],
      min: 0,
      max: 1440,
    },
    timeLabel: {
      type: String,
      required: true,
    },
    guests: {
      type: Number,
      required: [true, 'Guest count is required'],
      min: [1, 'At least 1 guest required'],
      max: [20, 'Maximum 20 guests per reservation'],
    },
    tablesCount: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    specialRequests: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Special requests cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'confirmed',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for rapid availability lookup and date filtering
reservationSchema.index({ date: 1, timeSlot: 1, status: 1 });
reservationSchema.index({ user: 1 });
reservationSchema.index({ phone: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
