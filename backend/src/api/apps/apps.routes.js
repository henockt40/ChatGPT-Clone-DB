import { Router } from 'express';
import { featureRateLimit } from '../../middleware/feature-rate-limit.js';
import { validateAppRun } from './validation/apps.validation.js';
import { listApps,runApp } from './controller/apps.controller.js';
const router=Router();
router.get('/',listApps);
router.post('/:appId/run',featureRateLimit('app',20),validateAppRun,runApp);
export default router;
