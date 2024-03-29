import express from 'express';
// import {userController} from './user.controller.js'
import { prisma } from '../../utils/prisma/index.js';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import passport from 'passport';


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
    const accessToken = jwt.sign(
        { userId },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_LIFE }
    );

    const refreshToken = jwt.sign(
        { userId },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_LIFE }
    );

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
            where: {userChekId: userInfo.id}
        });

        if (!user) {
            user = await prisma.users.create({
                data: {
                    userChekId: userInfo.id,
                    nickname: userInfo.nickname,
                    email: userInfo.email
                }
            });
        }
        
        // 사용자가 존재하든 새로 생성되었든, 토큰 발급
        const tokens = generateTokens(user.id);

        return res.json({
            ...tokens,
            user: {
                id: user.id,
                nickname: user.nickname,
                email: user.email
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error', error: err.toString() });
    }
});

router.get('/kakao', passport.authenticate('kakao'));

//* 카카오로 로그인하기 라우터 ***********************
//? /kakao로 요청오면, 카카오 로그인 페이지로 가게 되고, 카카오 서버를 통해 카카오 로그인을 하게 되면, 다음 라우터로 요청한다.
router.get("/auth/kakao", passport.authenticate("kakao"));

//? 위에서 카카오 서버 로그인이 되면, 카카오 redirect url 설정에 따라 이쪽 라우터로 오게 된다.
router.get(
  "/auth/kakao/callback",
  //? 그리고 passport 로그인 전략에 의해 kakaoStrategy로 가서 카카오계정 정보와 DB를 비교해서 회원가입시키거나 로그인 처리하게 한다.
  passport.authenticate("kakao", {
    failureRedirect: "/", // kakaoStrategy에서 실패한다면 실행
  }),
  // kakaoStrategy에서 성공한다면 콜백 실행
  (req, res) => {
    const token = req.user; // 사용자 토큰 정보 (예: JWT 토큰)
    const query = "?token=" + token;
    res.locals.token = token;

    res.redirect(`http://13.209.77.101:3000/${query}`);
  }
);

export default router;
