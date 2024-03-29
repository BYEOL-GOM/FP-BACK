import express from 'express';
import {
    createCommentController,
    // createCommentReplyController,
    // readCommentController,
    // updateCommentController,
    // deleteCommentController,
} from './comment.controller.js';

let router = express.Router({ mergeParams: true });

// 댓글(답변) 생성
router.post('/comments', createCommentController);

// // 대댓글 생성
// router.post('/comments/reply', createCommentReplyController);

// // 댓글 조회
// router.get('/comments', readCommentController);

// // 댓글 수정
// router.put('/comments/:commentId', updateCommentController);

// // 댓글 삭제
// router.delete('/comments/:commentId', deleteCommentController);

export default router;

