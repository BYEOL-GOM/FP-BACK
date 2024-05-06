import express from 'express';
import userRouter from './users/user.router.js';
import worryRouter from './worries/worry.router.js';
import commentRouter from './comments/comment.router.js';
import likeRouter from './likes/like.router.js';
import planetRouter from './planets/plannet.router.js';
import chatRouter from './chats/chat.router.js';

const router = express.Router();

router.use('/', userRouter);
router.use('/worries', worryRouter);
router.use('/', commentRouter);
router.use('/', likeRouter);
router.use('/', planetRouter);
router.use('/', chatRouter);

export default router;
