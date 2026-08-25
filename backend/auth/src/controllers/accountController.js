const Account = require('../models/Account');
const { success, error } = require('../utils/response');

function enrichAccount(account) {
  const obj = account.toObject ? account.toObject() : account;
  let creditUtilization = null;
  let utilizationStatus = null;
  let availableCredit = null;
  if (obj.accountType === 'credit' && obj.creditLimit > 0) {
    creditUtilization = Math.round((obj.currentOutstanding / obj.creditLimit) * 100);
    availableCredit = obj.creditLimit - obj.currentOutstanding;
    if (creditUtilization >= 90) utilizationStatus = 'critical';
    else if (creditUtilization >= 70) utilizationStatus = 'high';
    else if (creditUtilization >= 30) utilizationStatus = 'moderate';
    else utilizationStatus = 'low';
  }
  return { ...obj, creditUtilization, utilizationStatus, availableCredit };
}

exports.getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ userId: req.user._id, isActive: true }).sort({ createdAt: 1 });
    const enriched = accounts.map(enrichAccount);

    const nonCreditTypes = ['savings', 'current', 'salary', 'wallet', 'investment', 'other'];
    const totalAssets = enriched.filter((a) => nonCreditTypes.includes(a.accountType)).reduce((s, a) => s + a.balance, 0);
    const totalCredit = enriched.filter((a) => a.accountType === 'credit').reduce((s, a) => s + a.currentOutstanding, 0);
    const totalCreditLimit = enriched.filter((a) => a.accountType === 'credit').reduce((s, a) => s + a.creditLimit, 0);
    const overallCreditUtilization = totalCreditLimit > 0 ? Math.round((totalCredit / totalCreditLimit) * 100) : 0;

    return success(res, { accounts: enriched, summary: { totalAssets, totalCredit, totalCreditLimit, overallCreditUtilization, netWorth: totalAssets - totalCredit } });
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.createAccount = async (req, res) => {
  try {
    const { name, accountType, institution, balance, creditLimit, currentOutstanding, color, notes } = req.body;
    if (!name || !accountType) return error(res, 'name and accountType are required', 400);
    const account = await Account.create({
      userId: req.user._id,
      name,
      accountType,
      institution,
      balance: balance || 0,
      creditLimit: creditLimit || 0,
      currentOutstanding: currentOutstanding || 0,
      color,
      notes,
    });
    return success(res, { account: enrichAccount(account) }, 'Account created', 201);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!account) return error(res, 'Account not found', 404);
    const allowed = ['name', 'accountType', 'institution', 'balance', 'creditLimit', 'currentOutstanding', 'color', 'notes'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) account[f] = req.body[f]; });
    account.lastUpdated = new Date();
    await account.save();
    return success(res, { account: enrichAccount(account) }, 'Account updated');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!account) return error(res, 'Account not found', 404);
    account.isActive = false;
    await account.save();
    return success(res, null, 'Account deleted');
  } catch (err) {
    return error(res, err.message, 500);
  }
};
