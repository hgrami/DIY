import express from 'express';
import { checklistController } from '../controllers/checklist';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all checklist routes
router.use(authenticateToken);

// Checklist routes
router.get('/checklists', checklistController.getUserChecklists);
router.get('/checklists/:slug', checklistController.getChecklist);
router.post('/checklists', checklistController.createChecklist);
router.put('/checklists/:slug', checklistController.upsertChecklist);
router.delete('/checklists/:slug', checklistController.deleteChecklist);

// Item routes
router.post('/checklists/:slug/items', checklistController.addItem);
router.put('/checklists/:slug/items/:itemId', checklistController.updateItem);
router.delete('/checklists/:slug/items/:itemId', checklistController.deleteItem);

export default router;