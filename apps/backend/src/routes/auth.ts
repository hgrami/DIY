import { Router } from 'express';
import { AuthController } from '../controllers/auth';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/sync', authenticateToken, AuthController.syncUser);

export default router;