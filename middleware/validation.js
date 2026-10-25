const { body, validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name must be under 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9+\- ]{10,18}$/)
    .withMessage('Please enter a valid phone number'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  validate,
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate,
];

const reservationValidation = [
  body('customerName')
    .trim()
    .notEmpty()
    .withMessage('Please enter your full name')
    .isLength({ max: 100 })
    .withMessage('Name is too long'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Please enter your phone number')
    .matches(/^[0-9+\- ]{10,18}$/)
    .withMessage('Please enter a valid phone number (10 to 18 digits)'),
  body('date')
    .trim()
    .notEmpty()
    .withMessage('Please choose a date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Invalid date format (must be YYYY-MM-DD)'),
  body('timeSlot')
    .notEmpty()
    .withMessage('Please choose a time slot')
    .isInt({ min: 0, max: 1440 })
    .withMessage('Invalid time slot value'),
  body('guests')
    .notEmpty()
    .withMessage('Please choose guest count')
    .isInt({ min: 1, max: 20 })
    .withMessage('Number of guests must be between 1 and 20'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('specialRequests')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special requests cannot exceed 500 characters'),
  validate,
];

const reviewValidation = [
  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Review comment is required')
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5 stars'),
  body('authorName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }),
  validate,
];

const menuItemValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Dish name is required')
    .isLength({ max: 120 }),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('category')
    .trim()
    .notEmpty()
    .isIn(['starter', 'veg', 'nonveg', 'rice', 'bread', 'dessert', 'drink'])
    .withMessage('Invalid menu category'),
  body('isVeg')
    .optional()
    .isBoolean()
    .withMessage('isVeg must be true or false'),
  validate,
];

const chefValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Chef name is required')
    .isLength({ max: 100 }),
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Chef role is required')
    .isLength({ max: 100 }),
  body('bio')
    .trim()
    .notEmpty()
    .withMessage('Bio is required')
    .isLength({ max: 1000 }),
  validate,
];

module.exports = {
  registerValidation,
  loginValidation,
  reservationValidation,
  reviewValidation,
  menuItemValidation,
  chefValidation,
};
