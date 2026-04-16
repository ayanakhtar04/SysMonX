import { Router } from 'express';
import { vmController } from '../controllers/vm.controller';

const router = Router();

// POST /api/vms
router.post('/', vmController.create);

// GET /api/vms
router.get('/', vmController.getAll);

// GET /api/vms/:id/metrics
router.get('/:id/metrics', vmController.getMetrics);

// GET /api/vms/:id/status
router.get('/:id/status', vmController.getStatus);

export default router;
