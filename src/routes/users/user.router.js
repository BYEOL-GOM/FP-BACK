import express from 'express';
import { kakaoLoginController, naverLoginController, refreshController,WorryCountController } from './user.controller.js';
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
router.get('/count',authMiddleware, WorryCountController);


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
/**
 * @swagger
  /posts:
    post:
      summary: 새 게시물 등록
      tags:
        - Posts
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PostRequest'
      responses:
        '201':
          description: 게시물이 성공적으로 등록되었습니다.
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: 게시물이 성공적으로 등록되었습니다.
        '400':
          description: 데이터 형식이 올바르지 않음
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: 데이터 형식이 올바르지 않습니다.
    get:
      summary: 게시물 전체 조회
      tags:
        - Posts
      responses:
        '200':
          description: 게시물 전체 목록 조회 성공.
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
                    example: 게시물 전체 목록 조회 성공하였습니다.
 */

export default router;
