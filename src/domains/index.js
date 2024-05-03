import express from 'express';
import userRouter from './users/user.router.js';
import worryRouter from './worries/worry.router.js';
import commentRouter from './comments/comment.router.js';
import likeRouter from './likes/like.router.js';

const router = express.Router();

router.use('/', userRouter);
router.use('/worries', worryRouter);
router.use('/', commentRouter);
router.use('/', likeRouter);

export default router;
