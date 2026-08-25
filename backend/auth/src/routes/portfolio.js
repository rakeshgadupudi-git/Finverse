const express = require('express');
const router = express.Router();
const {
  getPortfolio,
  addHolding,
  editHolding,
  deleteHolding,
  getAnalytics,
  getNetWorth,
} = require('../controllers/portfolioController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getPortfolio);
router.get('/analytics', getAnalytics);
router.get('/net-worth', getNetWorth);
router.post('/holding', addHolding);
router.patch('/holding/:holdingId', editHolding);
router.delete('/holding/:holdingId', deleteHolding);

module.exports = router;
