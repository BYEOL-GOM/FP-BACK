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

// 토큰 발사대
router.get('/myNickname', authMiddleware, async (req, res, next) => {})

// 카카오 로그인
router.post('/kakao', kakaoLoginController);

// 네이버 로그인
router.post('/naver', naverLoginController);

// 엑세스 토큰 재발급
router.post('/refresh', refreshController);

// 좋아요된 고민의 갯수 조회하기
router.get('/count', authMiddleware, WorryCountController);

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

// 테스트용 행성 갯수 늘리기
router.put('/getStar', authMiddleware, async (req, res, next) => {
    try {
        const userId = res.locals.user.userId;

        // 사용자의 별 개수를 기존 값에서 10만큼 증가시키고 새로운 값을 반환
        const updatedUser = await prisma.users.update({
            where: {
                userId: userId,
            },
            data: {
                remainingStars: {
                    increment: 10, // 기존 값에 10을 더함
                },
            },
            select: {
                remainingStars: true, // 업데이트된 remainingStars 필드만 가져옴
            },
        });

        // 클라이언트에 업데이트된 별 개수를 응답
        res.status(200).json({
            message: '별 개수가 성공적으로 업데이트되었습니다.',
            remainingStars: updatedUser.remainingStars,
        });
    } catch (error) {
        console.error('별 개수 업데이트 실패:', error);
        res.status(500).json({ message: '내부 오류로 인해 별 개수 업데이트에 실패하였습니다.' });
    }
});

// 별 차감 계산 함수
function calculateStarCost(planetType) {
    switch (planetType) {
        case 'B':
            return 1;
        case 'C':
            return 3;
        case 'D':
            return 5;
        default:
            return 0; // A 행성
    }
}

// 헹성 구입
router.post('/buyPlanet', authMiddleware, async (req, res) => {
    const userId = res.locals.user.userId;
    const { planetType } = req.body;

    // 입력값 검증
    if (!planetType || !['A', 'B', 'C', 'D'].includes(planetType)) {
        return res.status(400).json({ message: '제공된 행성 유형이 유효하지 않습니다.' });
    }

    try {
        // 중복 구매 검사
        const existingPurchase = await prisma.planetBuyHistory.findFirst({
            where: {
                userId: userId,
                planetType: planetType,
            },
        });

        if (existingPurchase) {
            return res.status(409).json({ message: '이미 해당 유형의 행성을 구매하셨습니다.' });
        }

        // 트랜잭션 시작
        const result = await prisma.$transaction(async (prisma) => {
            const user = await prisma.users.findUnique({
                where: { userId: userId },
                select: { remainingStars: true },
            });

            if (!user) {
                throw new Error('사용자 정보를 찾을 수 없습니다.');
            }

            const starCost = calculateStarCost(planetType);

            if (user.remainingStars < starCost) {
                throw new Error('구매를 완료하기에 충분한 별이 없습니다.');
            }

            const updatedUser =
                starCost > 0
                    ? await prisma.users.update({
                          where: { userId: userId },
                          data: { remainingStars: { decrement: starCost } },
                          select: { remainingStars: true },
                      })
                    : user;

            const newPlanetPurchase = await prisma.planetBuyHistory.create({
                data: {
                    userId: userId,
                    planetType: planetType,
                },
            });

            return { updatedUser, newPlanetPurchase };
        });

        res.status(201).json({
            message: '행성 구매가 성공적으로 완료되었습니다.',
            purchaseDetails: result.newPlanetPurchase,
            remainingStars: result.updatedUser.remainingStars,
        });
    } catch (error) {
        console.error('행성 구매 트랜잭션 중 오류 발생:', error);
        res.status(500).json({
            message: '행성 구매 중 오류가 발생했습니다.',
            errorMessage: error.message,
        });
    }
});

// 사용자가 보유한 행성 조회하는 API
router.get('/getPlanets', authMiddleware, async (req, res) => {
    const userId = res.locals.user.userId; // 인증 미들웨어를 통해 얻은 사용자 ID

    try {
        // 해당 사용자의 모든 행성 구매 이력 중 행성 유형만 조회
        const purchasedPlanetTypes = await prisma.planetBuyHistory.findMany({
            where: {
                userId: userId,
            },
            select: {
                planetType: true, // 오직 행성 유형만 선택하여 반환
            },
        });

        // 결과 배열 생성, 기본 행성 'A'를 무조건 포함시킴
        const planetTypes = ['A'].concat(purchasedPlanetTypes.map((history) => history.planetType));

        // 중복 제거를 위해 Set을 사용, 다시 배열로 변환
        const uniquePlanetTypes = Array.from(new Set(planetTypes));

        res.status(200).json({
            message: '사용자가 구매한 행성 유형을 성공적으로 조회했습니다.',
            planetTypes: uniquePlanetTypes,
        });
    } catch (error) {
        console.error('행성 유형 조회 중 오류 발생:', error);
        res.status(500).json({
            message: '행성 유형 조회 중 서버 오류가 발생했습니다.',
            errorMessage: error.message,
        });
    }
});

// 행성 교체하는 API
router.put('/changePlanet', authMiddleware, async (req, res) => {
    const userId = res.locals.user.userId;
    const { newPlanetType } = req.body;

    try {
        // 사용자가 구매한 모든 행성 유형을 조회
        const purchasedPlanets = await prisma.planetBuyHistory.findMany({
            where: { userId: userId },
            select: { planetType: true },
        });

        const purchasedTypes = purchasedPlanets.map((p) => p.planetType);

        // A 행성은 구매 기록이 없어도 교체할 수 있도록 예외 처리
        if (newPlanetType !== 'A' && !purchasedTypes.includes(newPlanetType)) {
            return res.status(400).json({
                message: '요청된 행성 유형은 사용자가 구매한 행성 중에 없습니다. 교체할 수 없습니다.',
            });
        }

        // 검증 후, 행성 유형 업데이트
        const updatedUser = await prisma.users.update({
            where: {
                userId: userId,
            },
            data: {
                planet: newPlanetType,
            },
            select: {
                planet: true, // 업데이트된 행성 유형만 반환
            },
        });

        // 클라이언트에 업데이트된 행성 유형을 응답
        res.status(200).json({
            message: '행성 유형이 성공적으로 변경되었습니다.',
            newPlanetType: updatedUser.planet,
        });
    } catch (error) {
        console.error('행성 유형 변경 실패:', error);
        res.status(500).json({
            message: '행성 유형 변경 중 내부 오류가 발생했습니다.',
            errorMessage: error.message,
        });
    }
});

// 유저 정보 조회
router.get('/getUser', authMiddleware, async (req, res) => {
    const userId = res.locals.user.userId;

    try {
        const user = await prisma.users.findUnique({
            where: {
                userId: userId,
            },
            select: {
                planet: true,
                darkMode: true,
            },
        });

        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json({ message: '헤당 유저가 존재 하지 않습니다.' });
        }
    } catch (error) {
        res.status(500).json({ message: '사용자 정보를 검색하는 중 오류가 발생했습니다', error: error.message });
    }
});

// 다크모드 변경
router.put('/updateDarkMode', authMiddleware, async (req, res) => {
    const userId = res.locals.user.userId;
    const { darkMode } = req.body; // 클라이언트로부터 받은 새로운 다크모드 설정

    if (typeof darkMode !== 'boolean') {
        return res.status(400).json({ message: '잘못된 요청: darkMode는 boolean 타입이어야 합니다.' });
    }

    try {
        const updatedUser = await prisma.users.update({
            where: {
                userId: userId,
            },
            data: {
                darkMode: darkMode,
            },
        });

        res.status(200).json({
            message: '다크모드 설정이 업데이트되었습니다.',
            darkMode: updatedUser.darkMode,
        });
    } catch (error) {
        res.status(500).json({ message: '다크모드 설정을 업데이트하는 중 오류가 발생했습니다', error: error.message });
    }
});
