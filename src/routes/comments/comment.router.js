import express from 'express';
import {
    createCommentController,
    // createCommentReplyController,
    getCommentsByUserIdController,
    getCommentDetailController,

} from './comment.controller.js';

let router = express.Router({ mergeParams: true });

// 댓글(답변) 생성
router.post('/:worryId', createCommentController);

// // 대댓글 생성
// router.post('/comments/reply', createCommentReplyController);

// // 답변 조회 (고민작성자에 해당하는 답변 목록)
router.get('/', getCommentsByUserIdController);

// 답변 상세 조회 (고민자에게 도착할 답변 상세 조회)
router.get('/:commentId', getCommentDetailController);
export default router;

