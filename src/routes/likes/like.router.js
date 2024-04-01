import express from 'express';
import {
    sendLike,
    getSolvedWorries,
    getHelpedSolveWorries,
    getSolvedWorryDetails,
    getHelpedSolveWorryDetails,
} from './like.controller.js';

let router = express.Router({ mergeParams: true });

// 선물 보내기
router.post('/worries/:worryId/comments/:commentId/sendLike', sendLike);

// '나의 해결된 고민' 목록 전체 조회
router.get('/mySolvedWorry/:userId', getSolvedWorries);

// '나의 해결된 고민' 상세 조회
router.get('/mySolvedWorry/:worryId', getSolvedWorryDetails);

// '내가 해결한 고민' 목록 전체 조회
router.get('/myHelpedSolvedWorry/:userId', getHelpedSolveWorries);

// '내가 해결한 고민' 상세 조회
router.get('/myHelpedSolvedWorry/:worryId', getHelpedSolveWorryDetails);

export default router;
