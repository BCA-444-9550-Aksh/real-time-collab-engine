import { Router } from 'express';
import * as collabController from '../controllers/collaborator.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  addCollaboratorSchema,
  updateCollaboratorRoleSchema,
  collaboratorParamSchema,
} from '../validators/collaborator.validator';
import { docIdParamSchema } from '../validators/document.validator';

const router = Router({ mergeParams: true }); // mergeParams to access :id from parent

router.use(authenticate);

router.get('/',    docIdParamSchema && validate('params', docIdParamSchema), collabController.listCollaborators);
router.post('/',   validate('body', addCollaboratorSchema), collabController.addCollaborator);

router.patch(
  '/:userId',
  validate('params', collaboratorParamSchema),
  validate('body', updateCollaboratorRoleSchema),
  collabController.updateCollaboratorRole
);
router.delete(
  '/:userId',
  validate('params', collaboratorParamSchema),
  collabController.removeCollaborator
);

export default router;
