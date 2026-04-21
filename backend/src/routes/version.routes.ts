import { Router } from 'express';
import * as versionController from '../controllers/version.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rollbackSchema } from '../validators/document.validator';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/',      versionController.getHistory);
router.post('/',     validate('body', rollbackSchema), versionController.rollback);

export default router;
