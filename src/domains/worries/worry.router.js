import express from 'express';
import {
    createWorryController,
    worryDetailController,
    deleteOldMessagesController,
    deleteSelectedWorryController,
    reportMessageController,
    getRemainingWorries,
} from '../worries/worry.controller.js';
import authMiddleware from '../../middlewares/authMiddleware.js';

const router = express.Router();

// 사용자의 remainingWorries 개수 조회
router.get('/remaining-worries', authMiddleware, getRemainingWorries);

// 고민 메세지 작성
router.post('/', authMiddleware, createWorryController);

// 고민메세지 상세조회
router.get('/:worryId', authMiddleware, worryDetailController);

// 최초 고민에 24시간 동안 답변없는 고민 or 첫답장은 있지만 이후 답장이 24시간 동안 없는 고민 삭제
router.delete('/', deleteOldMessagesController);

// 곤란한 메세지 선택 삭제
router.delete('/:worryId/:commentId?', authMiddleware, deleteSelectedWorryController);

// 불쾌한 메세지 신고하기
router.post('/:worryId/comments/:commentId?/report', authMiddleware, reportMessageController);

export default router;
