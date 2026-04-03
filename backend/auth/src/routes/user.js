const express = require('express');
const router = express.Router();
const { getMe, updateProfile, changePassword, deleteAccount } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/me', getMe);
router.patch('/me', updateProfile);
router.patch('/change-password', changePassword);
router.delete('/me', deleteAccount);

module.exports = router;
