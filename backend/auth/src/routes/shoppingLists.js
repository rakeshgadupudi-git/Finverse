const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getLists,
  createList,
  updateList,
  addItem,
  updateItem,
  removeItem,
  convertToTransactions,
  deleteList,
} = require('../controllers/shoppingListController');

router.use(protect);

router.get('/', getLists);
router.post('/', createList);
router.patch('/:id', updateList);
router.delete('/:id', deleteList);
router.post('/:listId/items', addItem);
router.patch('/:listId/items/:itemId', updateItem);
router.delete('/:listId/items/:itemId', removeItem);
router.post('/:listId/convert', convertToTransactions);

module.exports = router;
