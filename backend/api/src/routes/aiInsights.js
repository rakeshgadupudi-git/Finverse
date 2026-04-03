import express from 'express';
import * as aiInsightsController from '../controllers/aiInsightsController.js';

const router = express.Router();

router.get('/:ticker', aiInsightsController.getInsights);

export default router;
