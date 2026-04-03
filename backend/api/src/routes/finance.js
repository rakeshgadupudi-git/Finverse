import express from 'express';
import {
  categorizeTransaction,
  getAnomalies,
  getBudgets,
  getForecast,
  getFinanceHealthScore,
  getMLStatus,
} from '../controllers/financeController.js';

const router = express.Router();

router.post('/categorize',   categorizeTransaction);
router.post('/anomalies',    getAnomalies);
router.post('/forecast',     getForecast);
router.post('/health-score', getFinanceHealthScore);
router.post('/budgets',      getBudgets);
router.get('/ml-status',     getMLStatus);

export default router;
