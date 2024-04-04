import express from 'express';
import {
    createReplyController,
    findLatestCommentsAndWorriesForUserController,
    getCommentDetailController,
} from './comment.controller.js';
import authMiddleware from '../../middlewares/authMiddleware.js';

const router = express.Router();

// 답장 보내기
router.post('/worries/:worryId/comments/:commentId?', authMiddleware, createReplyController);

//  모든 답장 전체 조회
router.get('/comments', authMiddleware, findLatestCommentsAndWorriesForUserController);

// 답장 상세조회
router.get('/comments/:commentId', authMiddleware, getCommentDetailController);

export default router;
