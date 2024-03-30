import express from 'express';
// import {userController} from './user.controller.js'
import { prisma } from '../../utils/prisma/index.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import passport from 'passport';

dotenv.config();

const router = express.Router();




//* 카카오로 로그인하기 라우터 ***********************
//? /kakao로 요청오면, 카카오 로그인 페이지로 가게 되고, 카카오 서버를 통해 카카오 로그인을 하게 되면, 다음 라우터로 요청한다.
router.get('/auth/kakao', passport.authenticate('kakao'));

//? 위에서 카카오 서버 로그인이 되면, 카카오 redirect url 설정에 따라 이쪽 라우터로 오게 된다.
router.get(
    '/auth/kakao/callback',
    passport.authenticate('kakao', { session: false }), // 세션을 사용하지 않도록 설정
    (req, res) => {
        // passport에서 처리된 토큰을 받아옴
        const token = req.user; // kakaoStrategy에서 done(null, token)으로 전달된 토큰

        // 클라이언트(예: 프론트엔드) 측에 토큰을 전달
        //res.header('Authorization', `Bearer ${token}`);
        //res.status(200).send({ message: '로그인이 성공하였습니다.' });
        //res.status(200).json({ token: token, message: '로그인이 성공하였습니다.' });
        // const redirectUrl = `http://13.209.77.101:3000/auth/kakao/callback#token=${token}`;
        res.cookie('token', token, {
            httpOnly: true,
            secure: false,//process.env.NODE_ENV !== 'development', // 개발 환경이 아닐 때만 secure 적용
            //path: '/',
            maxAge: 1000 * 60 * 60 * 24, // 쿠키 유효 시간 (예: 24시간)
            //sameSite: 'strict',
          });
        const redirectUrl = `http://13.209.77.101:3000/auth/kakao/callback`
        res.redirect(redirectUrl);
    },
);


export default router;




