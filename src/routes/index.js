import express from 'express';
import commentRouter from './comments/comment.router.js';
import likeRouter from './likes/like.router.js';
import userRouter from './users/user.router.js';
import worryRouter from './worries/worry.router.js';
const router = express.Router();
router.use('/worry', commentRouter);
router.use('/worry', likeRouter);
router.use('/', userRouter);
router.use('/worry', worryRouter);

export default router;