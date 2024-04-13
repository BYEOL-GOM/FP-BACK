import axios from 'axios';
import { prisma } from '../../utils/prisma/index.js';
import jwt from 'jsonwebtoken';

// 카카오
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
            const refreshToken = jwt.sign({ userId: createUser.userId }, process.env.REFRESH_TOKEN_SECRET, {
                expiresIn: process.env.REFRESH_TOKEN_LIFE,
            });
            return res
                .status(200)
                .json({ accessToken: `Bearer ${accessToken}`, refreshToken: `Bearer ${refreshToken}` });
            //return res.status(200).json(userInfo);
        }

        const accessToken = jwt.sign({ userId: findUser.userId }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_LIFE,
        });
        const refreshToken = jwt.sign({ userId: findUser.userId }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: process.env.REFRESH_TOKEN_LIFE,
        });

        return res.status(200).json({ accessToken: `Bearer ${accessToken}`, refreshToken: `Bearer ${refreshToken}` });
        //return res.status(200).json(ID);
    } catch (error) {
        console.error(error);
        return res.status(405).json({ message: '카카오 인증 및 사용자 정보 가져오기 오류' });
    }
};

// 네이버
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
            const refreshToken = jwt.sign({ userId: createUser.userId }, process.env.REFRESH_TOKEN_SECRET, {
                expiresIn: process.env.REFRESH_TOKEN_LIFE,
            });
            return res
                .status(200)
                .json({ accessToken: `Bearer ${accessToken}`, refreshToken: `Bearer ${refreshToken}` });
            //return res.status(200).json(userInfo);
        }

        const accessToken = jwt.sign({ userId: findUser.userId }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_LIFE,
        });
        const refreshToken = jwt.sign({ userId: findUser.userId }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: process.env.REFRESH_TOKEN_LIFE,
        });

        return res.status(200).json({ accessToken: `Bearer ${accessToken}`, refreshToken: `Bearer ${refreshToken}` });
        //return res.status(200).json(user);
    } catch (error) {
        console.error(error);
        return res.status(405).json({ message: '네이버 인증 및 사용자 정보 가져오기 오류' });
    }
};

// 리프레쉬
export const refreshController = async (req, res, next) => {
    try {
        const authorization = req.headers.authorization; // 직접 변수를 할당

        // Authorization 헤더의 존재 여부와 형식 검증
        if (!authorization || authorization.split(' ').length !== 2) {
            return res.status(401).json({ message: 'Refresh Token이 올바르게 전달되지 않았습니다.' });
        }

        const [bearer, refreshToken] = authorization.split(' ');

        // Bearer 타입 검증
        if (bearer !== 'Bearer') {
            return res.status(401).json({ message: '토큰 타입이 Bearer 형식이 아닙니다.' });
        }

        // Refresh Token 디코드
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        // 디코드된 정보로 사용자 조회
        const user = await prisma.users.findFirst({
            where: { userId: decoded.userId },
        });

        if (!user) {
            return res.status(404).json({ message: '토큰의 사용자를 찾을 수 없습니다.' });
        }

        // 새로운 토큰 발급
        const newAccessToken = jwt.sign({ userId: user.userId }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_LIFE,
        });
        const newRefreshToken = jwt.sign({ userId: user.userId }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: process.env.REFRESH_TOKEN_LIFE,
        });

        return res.status(200).json({
            message: '토큰이 재발급 되었습니다',
            accessToken: `Bearer ${newAccessToken}`,
            refreshToken: `Bearer ${newRefreshToken}`,
        });
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or Expired Token.' });
    }
};

// 좋아요된 고민의 갯수 조회하기
export const WorryCountController = async (req, res, next) => {
    try {
        const userId = res.locals.user.userId;
        const solvedWorriesCount = await prisma.worries.count({
            where: {
                commentAuthorId: +userId, // 이 값은 예시입니다. 실제 commentAuthorId 값으로 대체하세요.
                isSolved: true,
            },
        });
        return res.status(200).json(solvedWorriesCount);
    } catch (error) {
        next(error);
    }
};
