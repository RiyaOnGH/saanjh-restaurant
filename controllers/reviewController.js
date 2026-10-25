const Review = require('../models/Review');

// GET /api/reviews (public)
async function getPublishedReviews(req, res, next) {
  try {
    const reviews = await Review.find({ status: 'published' })
      .sort({ featured: -1, createdAt: -1 })
      .populate('user', 'name')
      .lean();

    return res.json({
      success: true,
      reviews,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/reviews (authenticated customer or admin)
async function createReview(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'You must be logged in to post a review.',
      });
    }

    const { rating, comment, authorName, authorLabel } = req.body;

    const name = (authorName && authorName.trim()) ? authorName.trim() : (req.user.name || 'Guest');
    const label = (authorLabel && authorLabel.trim()) ? authorLabel.trim() : 'Guest';

    const review = await Review.create({
      user: req.user._id,
      authorName: name,
      authorLabel: label,
      rating: parseInt(rating, 10),
      comment: comment.trim(),
      status: 'published',
      featured: false,
    });

    return res.status(201).json({
      success: true,
      message: 'Thank you! Your review has been posted.',
      review,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/reviews/:id (author or admin)
async function updateReview(req, res, next) {
  try {
    const { rating, comment, authorName, authorLabel, featured, status } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    const isAuthor = review.user && review.user.equals(req.user._id);
    const isAdminUser = req.user.role === 'admin';

    if (!isAuthor && !isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only edit your own reviews.',
      });
    }

    if (rating !== undefined) review.rating = parseInt(rating, 10);
    if (comment !== undefined) review.comment = comment.trim();
    if (authorName !== undefined) review.authorName = authorName.trim();
    if (authorLabel !== undefined) review.authorLabel = authorLabel.trim();

    // Only admin can adjust featured or status flags
    if (isAdminUser) {
      if (featured !== undefined) review.featured = Boolean(featured);
      if (status !== undefined) review.status = status;
    }

    await review.save();

    return res.json({
      success: true,
      message: 'Review updated successfully.',
      review,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/reviews/:id (author or admin)
async function deleteReview(req, res, next) {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.',
      });
    }

    const isAuthor = review.user && review.user.equals(req.user._id);
    const isAdminUser = req.user.role === 'admin';

    if (!isAuthor && !isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own reviews.',
      });
    }

    await Review.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: 'Review deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

// ADMIN: GET /api/admin/reviews
async function getAllReviewsAdmin(req, res, next) {
  try {
    const reviews = await Review.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      reviews,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPublishedReviews,
  createReview,
  updateReview,
  deleteReview,
  getAllReviewsAdmin,
};
