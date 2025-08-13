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

// Resource management routes
router.post('/projects/:shortId/materials', ProjectController.addMaterial);
router.post('/projects/:shortId/checklist', ProjectController.addTask);
router.post('/projects/:shortId/inspiration', ProjectController.addInspiration);
router.post('/projects/:shortId/notes', ProjectController.addNote);

// Interview context routes
router.get('/projects/:shortId/interview', ProjectController.getInterviewQuestions);
router.put('/projects/:shortId/interview', ProjectController.updateInterviewContext);

export default router;