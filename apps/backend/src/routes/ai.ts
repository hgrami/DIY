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

// AI chat thread routes
router.get('/projects/:shortId/ai-threads', AIController.getChatThreads);
router.get('/projects/:shortId/ai-threads/active', AIController.getActiveThread);
router.get('/projects/:shortId/ai-threads/:threadId', AIController.getChatThread);
router.delete('/projects/:shortId/ai-threads/:threadId', AIController.deleteChatThread);

// AI search routes
router.post('/search', AIController.search);
router.get('/performance-metrics', AIController.getPerformanceMetrics);

export default router;