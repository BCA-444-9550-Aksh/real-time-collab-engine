import { Router } from 'express';
import * as docController from '../controllers/document.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createDocSchema,
  updateDocSchema,
  docIdParamSchema,
} from '../validators/document.validator';

const router = Router();

// All document routes require auth
router.use(authenticate);

router.get('/',    docController.listDocs);
router.post('/',   validate('body', createDocSchema), docController.createDoc);

router.get(
  '/:id',
  validate('params', docIdParamSchema),
  docController.getDoc
);
router.patch(
  '/:id',
  validate('params', docIdParamSchema),
  validate('body', updateDocSchema),
  docController.updateDoc
);
router.delete(
  '/:id',
  validate('params', docIdParamSchema),
  docController.deleteDoc
);

export default router;
