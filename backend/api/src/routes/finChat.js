import express from 'express';
import * as finChatController from '../controllers/finChatController.js';

const router = express.Router();

router.post('/stream', finChatController.streamChat);

export default router;
