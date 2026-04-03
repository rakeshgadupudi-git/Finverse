const express = require('express');
const router = express.Router();
const {
  getPortfolio,
  addHolding,
  editHolding,
  deleteHolding,
  getAnalytics,
} = require('../controllers/portfolioController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getPortfolio);
router.get('/analytics', getAnalytics);
router.post('/holding', addHolding);
router.patch('/holding/:holdingId', editHolding);
router.delete('/holding/:holdingId', deleteHolding);

module.exports = router;
