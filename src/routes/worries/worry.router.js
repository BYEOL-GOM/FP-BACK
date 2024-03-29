import express from 'express';
import {
    createWorryController,
    WorryDetailController,
    getWorriesByCommentAuthorIdController,
    deleteWorryController,
} from '../worries/worry.controller.js';

const router = express.Router();

// 고민 메세지 작성 api
router.post('/', createWorryController);

// 답변자Id에게 해당하는 전체 고민 조회 api
router.get('/', getWorriesByCommentAuthorIdController);

// 고민메세지 상세조회
router.get('/:worryId', WorryDetailController);

// // 오래된 고민 삭제 api (24시간동안 답장이 없으면 소프트 삭제하기)
router.delete('/', deleteWorryController);

export default router;
