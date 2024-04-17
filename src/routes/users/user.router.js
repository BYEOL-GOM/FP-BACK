import express from 'express';
import {
    kakaoLoginController,
    naverLoginController,
    refreshController,
    WorryCountController,
} from './user.controller.js';
import { prisma } from '../../utils/prisma/index.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import passport from 'passport';
import authMiddleware from '../../middlewares/authMiddleware.js';

dotenv.config();

const router = express.Router();

// 카카오 로그인
router.post('/kakao', kakaoLoginController);

// 네이버 로그인
router.post('/naver', naverLoginController);

// 엑세스 토큰 재발급
router.post('/refresh', refreshController);

// 좋아요된 고민의 갯수 조회하기
router.get('/count', authMiddleware, WorryCountController);

// 임시 회원가입 API
router.post('/sign-up', async (req, res, next) => {
    try {
        const { nickname, email, userCheckId } = req.body;
        // 비밀번호 해싱
        const user = await prisma.users.create({
            data: {
                nickname,
                email,
                userCheckId,
            },
        });
        // Use the newly created userId as authorId

        return res.status(201).json({ user });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: '서버 오류' });
    }
});

// 닉네임 변경
router.put('/nickname', authMiddleware, async (req, res, next) => {
    const { nickname } = req.body; // 요청 본문에서 닉네임 가져오기
    const userId = res.locals.user.userId; // 현재 사용자의 ID 가져오기

    // 닉네임 길이 유효성 검사
    if (nickname.length >= 15) {
        return res.status(400).json({ message: '닉네임은 15글자 미만이어야 합니다.' });
    }

    try {
        // 사용자의 닉네임을 업데이트하고 결과를 반환
        const updatedUser = await prisma.users.update({
            where: { userId }, // 사용자 ID를 사용하여 해당 사용자를 찾습니다.
            data: { nickname }, // 새로운 닉네임으로 업데이트합니다.
        });

        return res.status(200).json({ message: '닉네임이 성공적으로 변경되었습니다.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: '서버 오류' });
    }
});

// 나의 닉네임 조회
router.get('/myNickname', authMiddleware, async (req, res, next) => {
    try {
        const userId = res.locals.user.userId;

        const myNickname = await prisma.users.findFirst({
            where: {
                userId: userId,
            },
            select: {
                nickname: true,
            },
        });

        if (!myNickname) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        return res.status(200).json({ nickname: myNickname.nickname });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: '서버 오류' });
    }
});
export default router;
