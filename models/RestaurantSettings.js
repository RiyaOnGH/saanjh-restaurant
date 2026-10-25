const mongoose = require('mongoose');

const restaurantSettingsSchema = new mongoose.Schema(
  {
    restaurantName: {
      type: String,
      default: 'Saanjh',
    },
    tagline: {
      type: String,
      default: 'An Evening of Indian Flavours',
    },
    subtitle: {
      type: String,
      default: 'Where every evening becomes a celebration.',
    },
    phone: {
      type: String,
      default: '+91 98765 43210',
    },
    email: {
      type: String,
      default: 'hello@saanjh.in',
    },
    address: {
      type: String,
      default: 'Near Pandra, Pahartoli / CCL Colony Area, Ranchi, Jharkhand, India',
    },
    openHoursText: {
      type: String,
      default: '11:00 AM - 10:30 PM, every day',
    },
    openHour: {
      type: Number,
      default: 11,
    },
    lastSeatingHour: {
      type: Number,
      default: 21,
    },
    slotMinutes: {
      type: Number,
      default: 60,
    },
    tablesPerSlot: {
      type: Number,
      default: 6,
    },
    guestsPerTable: {
      type: Number,
      default: 4,
    },
  },
  {
    timestamps: true,
  }
);

restaurantSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('RestaurantSettings', restaurantSettingsSchema);
