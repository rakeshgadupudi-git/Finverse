import express from 'express';
import * as livePriceController from '../controllers/livePriceController.js';

const router = express.Router();

router.get('/market-indices', livePriceController.getMarketIndices);
router.get('/', livePriceController.getLivePrice);

export default router;
