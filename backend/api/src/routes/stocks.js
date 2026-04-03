import express from 'express';
import * as stocksController from '../controllers/stocksController.js';

const router = express.Router();

router.get('/', stocksController.getStocks);
router.get('/:ticker', stocksController.getStockByTicker);

export default router;
