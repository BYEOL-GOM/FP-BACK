import express from 'express';
import {
    createCommentController,
    // createCommentReplyController,
    findLatestCommentsAndWorriesForUserController,
    getCommentDetailController,
} from './comment.controller.js';

let router = express.Router({ mergeParams: true });

// 최초 답변 생성
router.post('/worries/:worryId/comments', createCommentController);

//  모든 답장 전체 조회
router.get('/comments', findLatestCommentsAndWorriesForUserController);

// 답변 or 재고민, 재답변 상세 조회 (고민자에게 도착할 답변 상세 조회)
router.get('/comments/:commentId', getCommentDetailController);

export default router;
