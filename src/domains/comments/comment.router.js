import express from 'express';
import {
    createReplyController,
    getAllLatestMessagesController,
    getCommentDetailController,
    updateFruitCountController,
} from './comment.controller.js';
import authMiddleware from '../../middlewares/authMiddleware.js';

const router = express.Router();

// 답장 보내기
router.post('/worries/:worryId/comments/:commentId?', authMiddleware, createReplyController);

//  나에게 온 메세지 전체 조회
router.get('/comments', authMiddleware, getAllLatestMessagesController);

// 답장 상세조회
router.get('/comments/:commentId', authMiddleware, getCommentDetailController);

// 별 수확하기
router.post('/harvest', authMiddleware, updateFruitCountController);

export default router;
