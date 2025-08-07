import express from 'express';
import { AIController } from '../controllers/ai';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all AI routes
router.use(authenticateToken);

// AI chat routes
router.post('/projects/:shortId/ai-chat', AIController.chat);
router.get('/projects/:shortId/ai-history', AIController.getChatHistory);
router.delete('/projects/:shortId/ai-history', AIController.clearChatHistory);

export default router;