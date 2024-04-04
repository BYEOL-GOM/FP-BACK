import express from 'express';
import {
    createReplyController,
    findLatestCommentsAndWorriesForUserController,
    getCommentDetailController,
    deleteCommentController,
} from './comment.controller.js';

let router = express.Router({ mergeParams: true });

// 답장 보내기
router.post('/worries/:worryId/comments/:commentId?', createReplyController);

//  모든 답장 전체 조회
router.get('/comments', findLatestCommentsAndWorriesForUserController);

// 답장 상세조회
router.get('/comments/:commentId', getCommentDetailController);

// 답장 삭제 또는 신고하기
router.delete('/comments/:commentId', deleteCommentController);

export default router;
