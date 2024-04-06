import express from 'express';
import {
    createReplyController,
    findLatestCommentsAndWorriesForUserController,
    getCommentDetailController,
    deleteCommentController,
} from './comment.controller.js';
import authMiddleware from '../../middlewares/authMiddleware.js';

const router = express.Router();

// 답장 보내기
router.post('/worries/:worryId/comments/:commentId?', createReplyController);

//  모든 답장 전체 조회
router.get('/comments', authMiddleware, findLatestCommentsAndWorriesForUserController);

// 답장 상세조회
router.get('/comments/:commentId', authMiddleware, getCommentDetailController);

// 답장 삭제 또는 신고하기
router.delete('/comments/:commentId', deleteCommentController);

export default router;
