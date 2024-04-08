import express from 'express';
import {
    createWorryController,
    WorryDetailController,
    getWorriesByCommentAuthorIdController,
    deleteWorryController,
    deleteWorryByCommentAuthorController,
} from '../worries/worry.controller.js';
import authMiddleware from '../../middlewares/authMiddleware.js';

const router = express.Router();

// 고민 메세지 작성
router.post('/', authMiddleware, createWorryController);

// 전체 고민 조회 by 답변자id
router.get('/', authMiddleware, getWorriesByCommentAuthorIdController);

// 고민메세지 상세조회
router.get('/:worryId', authMiddleware, WorryDetailController);

// 오래된 고민 삭제 api (24시간동안 답장이 없으면 소프트 삭제하기)
router.delete('/', authMiddleware, deleteWorryController);

// 답변하지 못하거나, 불쾌한 내용의 고민 삭제
router.delete('/:worryId', authMiddleware, deleteWorryByCommentAuthorController);

export default router;
