import express from 'express';
import {
    createReplyController,
    getAllLatestMessagesController,
    getCommentDetailController,
    deleteCommentController,
    reportCommentController,
} from './comment.controller.js';
import authMiddleware from '../../middlewares/authMiddleware.js';

const router = express.Router();

// 답장 보내기
router.post('/worries/:worryId/comments/:commentId?', authMiddleware, createReplyController);
// router.post('/worries/:worryId/comments/:commentId?', createReplyController);

//  모든 답장 전체 조회
router.get('/comments', authMiddleware, getAllLatestMessagesController);

// 답장 상세조회
router.get('/comments/:commentId', authMiddleware, getCommentDetailController);
// router.get('/comments/:commentId', getCommentDetailController);

// 답변하기 어려운 답장 삭제하기
router.delete('/comments/:commentId', authMiddleware, deleteCommentController);

// 불쾌한 답장 신고하기 (삭제 포함)
router.post('/comments/:commentId/report', authMiddleware, reportCommentController);

export default router;
