import axios from 'axios';
import { prisma } from '../../utils/prisma/index.js';
import jwt from 'jsonwebtoken';


export const kakaoLoginController = async (req, res) => {
    try {
        const ID = process.env.KAKAO_REST_API_KEY;
        const redirect = process.env.KAKAO_REDIRECT_URI;
        const CODE = req.body.code;

        const response = await axios.post(
            `https://kauth.kakao.com/oauth/token?grant_type=authorization_code&client_id=${ID}&redirect_uri=${redirect}&code=${CODE}`,
            {},
            {
                headers: {
                    'Content-type': 'application/x-www-form-urlencoded',
                },
            },
        );

        const kakaoToken = response.data.access_token;

        const userInfoResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
            headers: {
                Authorization: `Bearer ${kakaoToken}`,
            },
        });

        const userInfo = userInfoResponse.data;

        const {
            id,
            kakao_account: {
                email,
                profile: { nickname },
            },
        } = userInfoResponse.data;

        const user = {
            id,
            email,
            nickname,
        };

        const findUser = await prisma.users.findFirst({
            where: { userCheckId: user.id.toString() },
        });

        if (!findUser) {
            const createUser = await prisma.users.create({
                data: {
                    userCheckId: user.id.toString(),
                    nickname: user.nickname,
                    email: user.email,
                },
            });

            const accessToken = jwt.sign({ userId: createUser.userId }, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: process.env.ACCESS_TOKEN_LIFE,
            });
            const refreshToken = jwt.sign({},process.env.REFRESH_TOKEN_SECRET, {
                expiresIn: process.env.REFRESH_TOKEN_LIFE,
            });
            return res.status(200).json({ accessToken: `Bearer ${accessToken}`, refreshToken: `Bearer ${refreshToken} `});
            //return res.status(200).json(userInfo);
        }

        const accessToken = jwt.sign({ userId: findUser.userId }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_LIFE,
        });
        const refreshToken = jwt.sign({},process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_LIFE });

        // console.log(accessToken);
        // console.log(refreshToken);
        // console.log(createUser.data);
        // console.log(findUser.data);
        // console.log('손흥민 봉준호 페이커 BTS');
        // console.log(createUser);
        // console.log(findUser);

        return res.status(200).json({ accessToken: `Bearer ${accessToken}`, refreshToken: `Bearer ${refreshToken} `});
        //return res.status(200).json(ID);
    } catch (error) {
        console.error(error);
        return res.status(405).json({ message: '카카오 인증 및 사용자 정보 가져오기 오류' });
    }
};












export const naverLoginController = async (req, res) => {
    try {
        const ID = process.env.NAVER_REST_API_ID;
        const redirect = process.env.NAVER_REDIRECT_URI;
        const CODE = req.body.code;
        const secret = process.env.NAVER_CLIENT_SECRET;

        const response = await axios.post(
            `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${ID}&client_secret=${secret}&code=${CODE}&state=test`,
            {},
            {
                headers: {
                    'Content-type': 'application/x-www-form-urlencoded',
                },
            },
        );

        const naverToken = response.data.access_token;

        const userInfoResponse = await axios.get('https://openapi.naver.com/v1/nid/me', {
            headers: {
                Authorization: `Bearer ${naverToken}`,
            },
        });

        const userInfo = userInfoResponse.data;

        const { id, email, nickname } = userInfo;

        const user = {
            id,
            email,
            nickname,
        };

        const findUser = await prisma.users.findFirst({
            where: { userCheckId: user.id },
        });

        if (!findUser) {
            const createUser = await prisma.users.create({
                data: {
                    userCheckId: user.id,
                    nickname: user.nickname,
                    email: user.email,
                },
            });

            const accessToken = jwt.sign({ userId: createUser.userId }, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: process.env.ACCESS_TOKEN_LIFE,
            });
            const refreshToken = jwt.sign({userId: createUser.userId},process.env.REFRESH_TOKEN_SECRET, {
                expiresIn: process.env.REFRESH_TOKEN_LIFE,
            });
            return res.status(200).json({ accessToken: `Bearer ${accessToken}`, refreshToken: `Bearer ${refreshToken} `});
            //return res.status(200).json(userInfo);
        }

        const accessToken = jwt.sign({ userId: findUser.userId }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_LIFE,
        });
        const refreshToken = jwt.sign({userId: findUser.userId},process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_LIFE });


        return res.status(200).json({ accessToken: `Bearer ${accessToken}`, refreshToken: `Bearer ${refreshToken} `});
        //return res.status(200).json(user);
    } catch (error) {
        console.error(error);
        return res.status(405).json({ message: '네이버 인증 및 사용자 정보 가져오기 오류' });
    }
};

