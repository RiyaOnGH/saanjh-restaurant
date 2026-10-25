const MenuItem = require('../models/MenuItem');

// GET /api/menu (public)
async function getAllMenuItems(req, res, next) {
  try {
    const { category, availableOnly } = req.query;
    const query = {};

    if (category && category !== 'all') {
      query.category = category;
    }
    if (availableOnly === 'true') {
      query.isAvailable = true;
    }

    const items = await MenuItem.find(query).sort({ category: 1, order: 1, name: 1 }).lean();

    // Group items by category for convenience
    const categories = ['starter', 'veg', 'nonveg', 'rice', 'bread', 'dessert', 'drink'];
    const grouped = {};
    categories.forEach((cat) => {
      grouped[cat] = items.filter((item) => item.category === cat);
    });

    return res.json({
      success: true,
      count: items.length,
      items,
      grouped,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/menu/:id
async function getMenuItemById(req, res, next) {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found.',
      });
    }
    return res.json({
      success: true,
      item,
    });
  } catch (err) {
    next(err);
  }
}

// ADMIN: POST /api/menu
async function createMenuItem(req, res, next) {
  try {
    const { name, description, price, category, isVeg, image, isAvailable, order } = req.body;

    const item = await MenuItem.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      price: parseFloat(price),
      category,
      isVeg: isVeg !== undefined ? Boolean(isVeg) : category === 'veg',
      image: image ? image.trim() : '',
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      order: parseInt(order, 10) || 0,
    });

    return res.status(201).json({
      success: true,
      message: 'Menu item added successfully.',
      item,
    });
  } catch (err) {
    next(err);
  }
}

// ADMIN: PUT /api/menu/:id
async function updateMenuItem(req, res, next) {
  try {
    const { name, description, price, category, isVeg, image, isAvailable, order } = req.body;

    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found.',
      });
    }

    if (name !== undefined) item.name = name.trim();
    if (description !== undefined) item.description = description.trim();
    if (price !== undefined) item.price = parseFloat(price);
    if (category !== undefined) item.category = category;
    if (isVeg !== undefined) item.isVeg = Boolean(isVeg);
    if (image !== undefined) item.image = image.trim();
    if (isAvailable !== undefined) item.isAvailable = Boolean(isAvailable);
    if (order !== undefined) item.order = parseInt(order, 10);

    await item.save();

    return res.json({
      success: true,
      message: 'Menu item updated successfully.',
      item,
    });
  } catch (err) {
    next(err);
  }
}

// ADMIN: DELETE /api/menu/:id
async function deleteMenuItem(req, res, next) {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found.',
      });
    }

    return res.json({
      success: true,
      message: 'Menu item deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
