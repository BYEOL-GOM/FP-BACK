import express from 'express';
import { sendPresent, getSolvedWorries, getHelpedSolveWorries } from './present.controller.js';

let router = express.Router({ mergeParams: true });

// 선물 보내기
router.post('/worry/:worryId/comments/:commentId/sendPresent', sendPresent);

//선물을 보낸 A유저의 해결된 고민 목록 조회
router.get('/mySolvedWorry', getSolvedWorries);

// 선물을 받은 B유저가 해결한 고민 목록 조회
router.get('/myHelpedSolveWorry', getHelpedSolveWorries);

export default router;
