const RestaurantSettings = require('../models/RestaurantSettings');

// GET /api/settings (public)
async function getSettings(req, res, next) {
  try {
    const settings = await RestaurantSettings.getSettings();
    return res.json({
      success: true,
      settings,
    });
  } catch (err) {
    next(err);
  }
}

// ADMIN: PUT /api/settings
async function updateSettings(req, res, next) {
  try {
    const settings = await RestaurantSettings.getSettings();
    const fields = [
      'restaurantName',
      'tagline',
      'subtitle',
      'phone',
      'email',
      'address',
      'openHoursText',
      'openHour',
      'lastSeatingHour',
      'slotMinutes',
      'tablesPerSlot',
      'guestsPerTable',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    await settings.save();

    return res.json({
      success: true,
      message: 'Restaurant settings updated successfully.',
      settings,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
