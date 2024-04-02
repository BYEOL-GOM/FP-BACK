import express from 'express';
import {
    createCommentController,
    findLatestCommentsAndWorriesForUserController,
    getCommentDetailController,
    createReplyController,
} from './comment.controller.js';

let router = express.Router({ mergeParams: true });

// 최초 답변 생성
router.post('/worries/:worryId/comments', createCommentController);

//  모든 답장 전체 조회
router.get('/comments', findLatestCommentsAndWorriesForUserController);

// 답장 상세조회
router.get('/comments/detail', getCommentDetailController);

// 답장 보내기
router.post('/worries/:worryId/comments/:commentId?', createReplyController);

export default router;
