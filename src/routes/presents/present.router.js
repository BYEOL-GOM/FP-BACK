import express from 'express';
import {
    sendPresent,
    getSolvedWorries,
    getHelpedSolveWorries,
    getSolvedWorryDetails,
    getHelpedSolveWorryDetails,
} from './present.controller.js';

let router = express.Router({ mergeParams: true });

// 선물 보내기
router.post('/worry/:worryId/comments/:commentId/sendPresent', sendPresent);

// '나의 해결된 고민' 목록 전체 조회
router.get('/mySolvedWorry', getSolvedWorries);

// '나의 해결된 고민' 상세 조회
router.get('/mySolvedWorry/:worryId', getSolvedWorryDetails);

// '내가 해결한 고민' 목록 전체 조회
router.get('/myHelpedSolveWorry', getHelpedSolveWorries);

// '내가 해결한 고민' 상세 조회
router.get('/myHelpedSolveWorry/:worryId', getHelpedSolveWorryDetails);

export default router;
