import { Router } from 'express';
import * as chatController from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.use(authenticate);
router.get('/', chatController.getMessages);

export default router;
