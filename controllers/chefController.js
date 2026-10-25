const Chef = require('../models/Chef');

// GET /api/chefs (public)
async function getAllChefs(req, res, next) {
  try {
    const chefs = await Chef.find().sort({ order: 1, createdAt: 1 }).lean();
    return res.json({
      success: true,
      chefs,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/chefs/:id
async function getChefById(req, res, next) {
  try {
    const chef = await Chef.findById(req.params.id);
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: 'Chef profile not found.',
      });
    }
    return res.json({
      success: true,
      chef,
    });
  } catch (err) {
    next(err);
  }
}

// ADMIN: POST /api/chefs
async function createChef(req, res, next) {
  try {
    const { name, role, bio, specialties, initials, image, order } = req.body;

    const parsedSpecialties = Array.isArray(specialties)
      ? specialties
      : typeof specialties === 'string'
      ? specialties.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const chef = await Chef.create({
      name: name.trim(),
      role: role.trim(),
      bio: bio.trim(),
      specialties: parsedSpecialties,
      initials: initials ? initials.trim().toUpperCase() : undefined,
      image: image ? image.trim() : '',
      order: parseInt(order, 10) || 0,
    });

    return res.status(201).json({
      success: true,
      message: 'Chef profile added successfully.',
      chef,
    });
  } catch (err) {
    next(err);
  }
}

// ADMIN: PUT /api/chefs/:id
async function updateChef(req, res, next) {
  try {
    const { name, role, bio, specialties, initials, image, order } = req.body;

    const chef = await Chef.findById(req.params.id);
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: 'Chef profile not found.',
      });
    }

    if (name !== undefined) chef.name = name.trim();
    if (role !== undefined) chef.role = role.trim();
    if (bio !== undefined) chef.bio = bio.trim();
    if (initials !== undefined) chef.initials = initials.trim().toUpperCase();
    if (image !== undefined) chef.image = image.trim();
    if (order !== undefined) chef.order = parseInt(order, 10);

    if (specialties !== undefined) {
      chef.specialties = Array.isArray(specialties)
        ? specialties
        : typeof specialties === 'string'
        ? specialties.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    }

    await chef.save();

    return res.json({
      success: true,
      message: 'Chef profile updated successfully.',
      chef,
    });
  } catch (err) {
    next(err);
  }
}

// ADMIN: DELETE /api/chefs/:id
async function deleteChef(req, res, next) {
  try {
    const chef = await Chef.findByIdAndDelete(req.params.id);
    if (!chef) {
      return res.status(404).json({
        success: false,
        message: 'Chef profile not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Chef profile removed successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllChefs,
  getChefById,
  createChef,
  updateChef,
  deleteChef,
};
