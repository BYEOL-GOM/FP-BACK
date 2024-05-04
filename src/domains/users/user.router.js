import express from 'express';
import { kakaoLoginController, naverLoginController, refreshController } from './user.controller.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// 카카오 로그인
router.post('/kakao', kakaoLoginController);

// 네이버 로그인
router.post('/naver', naverLoginController);

// 엑세스 토큰 재발급
router.post('/refresh', refreshController);

export default router;
