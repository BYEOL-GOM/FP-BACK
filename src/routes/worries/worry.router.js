import express from 'express';
import {
    createWorryController,
    WorryDetailController,
    deleteOldMessagesController,
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
router.get('/:worryId', authMiddleware, authMiddleware, WorryDetailController);

// 최초 고민에 24시간 동안 답변없는 고민 or 첫답장은 있지만 이후 답장이 24시간 동안 없는 고민 삭제
router.delete('/', deleteOldMessagesController);

// 답변하기 어려운 고민(Worry) 삭제
router.delete('/:worryId', authMiddleware, deleteSelectedWorryController);

// 불쾌한 고민 신고하기
router.post('/:worryId/report', authMiddleware, reportWorryController);

export default router;
