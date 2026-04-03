const User = require('../models/User');
const { success, error } = require('../utils/response');

// GET /api/user/me
const getMe = async (req, res, next) => {
  try {
    return success(res, { user: req.user });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/user/me
const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return error(res, 'Name is required', 400);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    return success(res, { user });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/user/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return error(res, 'currentPassword and newPassword are required', 400);
    }
    if (newPassword.length < 6) {
      return error(res, 'New password must be at least 6 characters', 400);
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return error(res, 'Current password is incorrect', 400);
    }

    user.password = newPassword;
    await user.save();

    return success(res, {}, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/user/me
const deleteAccount = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    return success(res, {}, 'Account deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { getMe, updateProfile, changePassword, deleteAccount };
