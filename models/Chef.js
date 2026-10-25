const mongoose = require('mongoose');

const chefSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Chef name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    role: {
      type: String,
      required: [true, 'Chef role is required'],
      trim: true,
      maxlength: [100, 'Role cannot exceed 100 characters'],
    },
    bio: {
      type: String,
      required: [true, 'Biography is required'],
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },
    specialties: {
      type: [String],
      default: [],
    },
    initials: {
      type: String,
      trim: true,
      maxlength: [4, 'Initials cannot exceed 4 characters'],
    },
    image: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-derive initials if not provided
chefSchema.pre('save', function (next) {
  if (!this.initials && this.name) {
    const parts = this.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      this.initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else {
      this.initials = parts[0].substring(0, 2).toUpperCase();
    }
  }
  next();
});

module.exports = mongoose.model('Chef', chefSchema);
