const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getGoals, createGoal, updateGoal, deleteGoal } = require('../controllers/goalController');

router.use(protect);

router.get('/',          getGoals);
router.post('/',         createGoal);
router.patch('/:goalId', updateGoal);
router.delete('/:goalId', deleteGoal);

module.exports = router;
