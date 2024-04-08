import express from 'express';
import {
    createWorryController,
    WorryDetailController,
    deleteWorryController,
    deleteSelectedWorryController,
    reportWorryController,
    getRemainingWorries,
} from '../worries/worry.controller.js';
import authMiddleware from '../../middlewares/authMiddleware.js';

const router = express.Router();

// 사용자의 remainingWorries 개수 조회
router.get('/remaining-worries', authMiddleware, getRemainingWorries);

// 고민 메세지 작성
router.post('/', authMiddleware, createWorryController);

// 고민메세지 상세조회
router.get('/:worryId', authMiddleware, WorryDetailController);

// 오래된 고민 삭제 api (24시간동안 답장이 없으면 소프트 삭제하기)
router.delete('/', deleteWorryController);

// 답변하기 어려운 고민(Worry) 삭제하기
router.delete('/:worryId', authMiddleware, deleteSelectedWorryController);

// 불쾌한 고민 신고하기
router.post('/:worryId/report', authMiddleware, reportWorryController);

export default router;
