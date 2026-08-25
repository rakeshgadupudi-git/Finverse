const ShoppingList = require('../models/ShoppingList');
const Transaction = require('../models/Transaction');
const { success, error } = require('../utils/response');

function enrichList(list) {
  const obj = list.toObject ? list.toObject() : list;
  const totalEstimated = obj.items.reduce((s, i) => s + (i.estimatedPrice || 0) * (i.quantity || 1), 0);
  const totalActual = obj.items
    .filter((i) => i.checked && i.actualPrice != null)
    .reduce((s, i) => s + (i.actualPrice || 0) * (i.quantity || 1), 0);
  const checkedCount = obj.items.filter((i) => i.checked).length;
  const itemCount = obj.items.length;
  return { ...obj, totalEstimated, totalActual, checkedCount, itemCount };
}

exports.getLists = async (req, res) => {
  try {
    const lists = await ShoppingList.find({ userId: req.user._id, isActive: true }).sort({ createdAt: -1 });
    return success(res, { lists: lists.map(enrichList) });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.createList = async (req, res) => {
  try {
    const { name, store, items } = req.body;
    if (!name) return error(res, 'name is required', 400);
    const list = await ShoppingList.create({ userId: req.user._id, name, store, items: items || [] });
    return success(res, { list: enrichList(list) }, 'Shopping list created', 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.updateList = async (req, res) => {
  try {
    const list = await ShoppingList.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!list) return error(res, 'List not found', 404);
    ['name', 'store', 'status'].forEach((f) => { if (req.body[f] !== undefined) list[f] = req.body[f]; });
    await list.save();
    return success(res, { list: enrichList(list) }, 'List updated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.addItem = async (req, res) => {
  try {
    const list = await ShoppingList.findOne({ _id: req.params.listId, userId: req.user._id, isActive: true });
    if (!list) return error(res, 'List not found', 404);
    const { name, estimatedPrice, actualPrice, quantity, unit, category } = req.body;
    if (!name) return error(res, 'Item name is required', 400);
    list.items.push({ name, estimatedPrice, actualPrice, quantity, unit, category });
    await list.save();
    return success(res, { list: enrichList(list) }, 'Item added', 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.updateItem = async (req, res) => {
  try {
    const list = await ShoppingList.findOne({ _id: req.params.listId, userId: req.user._id, isActive: true });
    if (!list) return error(res, 'List not found', 404);
    const item = list.items.id(req.params.itemId);
    if (!item) return error(res, 'Item not found', 404);
    const allowed = ['name', 'estimatedPrice', 'actualPrice', 'quantity', 'unit', 'category', 'checked'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) item[f] = req.body[f]; });
    await list.save();
    return success(res, { list: enrichList(list) }, 'Item updated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.removeItem = async (req, res) => {
  try {
    const list = await ShoppingList.findOne({ _id: req.params.listId, userId: req.user._id, isActive: true });
    if (!list) return error(res, 'List not found', 404);
    list.items.pull({ _id: req.params.itemId });
    await list.save();
    return success(res, { list: enrichList(list) }, 'Item removed');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.convertToTransactions = async (req, res) => {
  try {
    const list = await ShoppingList.findOne({ _id: req.params.listId, userId: req.user._id, isActive: true });
    if (!list) return error(res, 'List not found', 404);

    const { itemIds } = req.body;
    const eligible = list.items.filter((i) => {
      if (!i.checked || i.convertedTxId) return false;
      if (itemIds && itemIds.length > 0) return itemIds.includes(String(i._id));
      return true;
    });

    if (eligible.length === 0) return error(res, 'No eligible checked items to convert', 400);

    const transactions = [];
    for (const item of eligible) {
      const tx = await Transaction.create({
        userId: req.user._id,
        description: item.name,
        amount: (item.actualPrice != null ? item.actualPrice : item.estimatedPrice) * item.quantity,
        type: 'EXPENSE',
        category: item.category || 'Shopping',
        date: new Date(),
      });
      item.convertedTxId = tx._id;
      transactions.push(tx);
    }

    const allConverted = list.items.every((i) => !i.checked || i.convertedTxId);
    if (allConverted) list.status = 'completed';
    await list.save();

    return success(res, { transactions, list: enrichList(list) }, `${transactions.length} transaction(s) created`);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.deleteList = async (req, res) => {
  try {
    const list = await ShoppingList.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!list) return error(res, 'List not found', 404);
    list.isActive = false;
    await list.save();
    return success(res, null, 'List deleted');
  } catch (err) {
    return error(res, err.message, 500);
  }
};
