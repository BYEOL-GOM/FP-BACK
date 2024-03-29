import express from 'express';
import {
    createCommentController,
    // createCommentReplyController,
    getCommentController,
    // updateCommentController,
    // deleteCommentController,
} from './comment.controller.js';

let router = express.Router({ mergeParams: true });

// 댓글(답변) 생성
router.post('/comments', createCommentController);

// // 대댓글 생성
// router.post('/comments/reply', createCommentReplyController);

// // 댓글 조회 (고민자에게 도착할 댓글 목록)
router.get('/comments', getCommentController);

// 댓글 상세 조회 (고민자에게 도착할 답변 상세 조회)

export default router;
