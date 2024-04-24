import express from 'express';
import {
    sendLike,
    getSolvedWorries,
    getHelpedSolveWorries,
    getSolvedWorryDetails,
    getHelpedSolveWorryDetails,
    getTopLikedCommentAuthors,
} from './like.controller.js';
import authMiddleware from '../../middlewares/authMiddleware.js';

let router = express.Router({ mergeParams: true });

// 선물 보내기
router.post('/worries/:worryId/comments/:commentId/sendLike', authMiddleware, sendLike);
// router.post('/worries/:worryId/comments/:commentId/sendLike', sendLike);

// '나의 해결된 고민' 목록 전체 조회 -> '내가 등록한 고민' 목록 전체 조회
// router.get('/mySolvedWorry', authMiddleware, getSolvedWorries);
router.get('/mySolvedWorry', getSolvedWorries);

// '내가 해결한 고민' 목록 전체 조회 -> '내가 답변한 고민' 목록 전체 조회
// router.get('/myHelpedSolvedWorry', authMiddleware, getHelpedSolveWorries);
router.get('/myHelpedSolvedWorry', getHelpedSolveWorries);

// '나의 해결된 고민' 상세 조회 -> '내가 등록한 고민' 상세 조회
// router.get('/mySolvedWorry/:worryId', authMiddleware, getSolvedWorryDetails);
router.get('/mySolvedWorry/:worryId', getSolvedWorryDetails);

// '내가 해결한 고민' 상세 조회 -> '내가 답변한 고민' 상세 조회
// router.get('/myHelpedSolvedWorry/:worryId', authMiddleware, getHelpedSolveWorryDetails);
router.get('/myHelpedSolvedWorry/:worryId', getHelpedSolveWorryDetails);

// 좋아요를 가장 많이 받은 탑 5위 댓글 조회
router.get('/top-likes', authMiddleware, getTopLikedCommentAuthors);
// router.get('/top-likes', getTopLikedCommentAuthors);

export default router;
