import express from 'express';
import {
    createWorryController,
    sendWorryDetailController,
    deleteWorryController,
} from '../worries/worry.controller.js';

const router = express.Router();

// 고민 메세지 작성 api
router.post('/', createWorryController);

// // 고민메세지를 랜덤한 사람에게 전송하기(상세조회)
router.get('/:worryId/send', sendWorryDetailController);

// // 오래된 고민 삭제 api (24시간동안 답장이 없으면 소프트 삭제하기)
router.delete('/:worryId', deleteWorryController);

export default router;
