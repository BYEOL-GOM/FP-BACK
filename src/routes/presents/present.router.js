import express from 'express';
import { sendPresent, getSolvedWorries, getHelpedSolveWorries } from './present.controller.js';

let router = express.Router({ mergeParams: true });

// 선물 보내기
router.post('/worry/:worryId/comments/:commentId/sendPresent', sendPresent);

// A유저가 선물을 보낸 '나의 해결된 고민' 목록 조회
router.get('/mySolvedWorry', getSolvedWorries);

// A유저가 선물을 받은 '나의 해결한 고민' 목록 조회
router.get('/myHelpedSolveWorry', getHelpedSolveWorries);

export default router;
