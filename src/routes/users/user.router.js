import express from 'express';
// import {userController} from './user.controller.js'
import { prisma } from '../../utils/prisma/index.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// 수정하기 전 코드
// router.post('/naver', async (req, res, next) => {
//     try {
//         // 요청에서 access_token을 추출합니다.
//         const access_token= req.headers['access_token'];
//         const index = access_token.indexOf('&');
//         const result = access_token.substring(0, index);

//         // 네이버 Open API를 호출하여 사용자 정보를 요청합니다.
//         const apiUrl = 'https://openapi.naver.com/v1/nid/me';
//         const headers = {
//             Authorization: `Bearer ${result}`,
//         };

//         const response = await axios.get(apiUrl, { headers });
//         const userInpo = response.data.response

//         const findUser = await prisma.users.findFirst({
//             where: {userChekId: userInpo.id}
//         })

//           if (!findUser){
//              const sigup = await prisma.users.create({
//                 userChekId: userInpo.id,
//                 nickname: userInpo.nickname,
//                 email: userInpo.email
//              })
//          }

//          return res.json(userInpo);

//     } catch (err) {
//         // 오류 발생 시, 에러 핸들링
//         console.error(err);
//         next(err);
//     }
// });

// 수정한 후 코드

const generateTokens = (userId) => {
    const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_LIFE,
    });
    const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_LIFE,
    });

    return { accessToken, refreshToken };
};

router.post('/naver', async (req, res, next) => {
    try {
        const accessTokenHeader = req.headers['access_token'];
        const index = accessTokenHeader.indexOf('&');
        const token = accessTokenHeader.substring(0, index);

        const apiUrl = 'https://openapi.naver.com/v1/nid/me';
        const headers = {
            Authorization: `Bearer ${token}`,
        };

        const response = await axios.get(apiUrl, { headers });
        const userInfo = response.data.response;

        let user = await prisma.users.findFirst({
            where: { userCheckId: userInfo.id },
        });

        if (!user) {
            user = await prisma.users.create({
                data: {
                    userCheckId: userInfo.id,
                    nickname: userInfo.nickname,
                    email: userInfo.email,
                },
            });
        }
        // 사용자가 존재하든 새로 생성되었든, 토큰 발급
        const tokens = generateTokens(user.id);

        return res.json({
            ...tokens,
            user: {
                id: user.id,
                nickname: user.nickname,
                email: user.email,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error', error: err.toString() });
    }
});

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

        return res.status(201).json({ user });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: '서버 오류' });
    }
});
export default router;
