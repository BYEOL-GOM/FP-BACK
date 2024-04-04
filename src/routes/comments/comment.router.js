import express from 'express';
import {
    createReplyController,
    findLatestCommentsAndWorriesForUserController,
    getCommentDetailController,
} from './comment.controller.js';

let router = express.Router({ mergeParams: true });

// 답장 보내기
router.post('/worries/:worryId/comments/:commentId?', createReplyController);

//  모든 답장 전체 조회
router.get('/comments', findLatestCommentsAndWorriesForUserController);

// 답장 상세조회
router.get('/comments/:commentId', getCommentDetailController);

export default router;
