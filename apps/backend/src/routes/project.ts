import express from 'express';
import { ProjectController } from '../controllers/project';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all project routes
router.use(authenticateToken);

// Project routes
router.post('/projects', ProjectController.createProject);
router.get('/projects', ProjectController.getUserProjects);
router.get('/projects/:shortId', ProjectController.getProject);
router.patch('/projects/:shortId', ProjectController.updateProject);
router.delete('/projects/:shortId', ProjectController.deleteProject);
router.get('/projects/:shortId/stats', ProjectController.getProjectStats);

export default router;