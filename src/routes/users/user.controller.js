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

        const {
            id,
            kakao_account: {
                email,
                profile: { nickname },
            },
        } = userInfo;

        const user = {
            id,
            email,
            nickname,
        };

        const findUser = await prisma.users.findFirst({
            where: { userCheckId: user.id.toString() },
        });

        if (!findUser) {
            const lastUser = await prisma.users.count();
            const createUser = await prisma.users.create({
                data: {
                    userCheckId: user.id.toString(),
                    nickname: `고민의 늪에 빠진 곰 ${lastUser + 1}`,
                    email: user.email,
                    // 'planet' 필드는 스키마에서 기본값 'A'가 정의되어 있으므로 여기서 명시적으로 지정하지 않아도 됩니다.
                },
            });

            const accessToken = jwt.sign(
                { userId: createUser.userId },
                process.env.ACCESS_TOKEN_SECRET,
                {
                    expiresIn: process.env.ACCESS_TOKEN_LIFE,
                },
            );
            const refreshToken = jwt.sign(
                { userId: createUser.userId },
                process.env.REFRESH_TOKEN_SECRET,
                {
                    expiresIn: process.env.REFRESH_TOKEN_LIFE,
                },
            );
            return res
                .status(200)
                .json({ accessToken: `Bearer ${accessToken}`, refreshToken: `Bearer ${refreshToken}` });
        }

        const accessToken = jwt.sign(
            { userId: findUser.userId },
            process.env.ACCESS_TOKEN_SECRET,
            {
                expiresIn: process.env.ACCESS_TOKEN_LIFE,
            },
        );
        const refreshToken = jwt.sign(
            { userId: findUser.userId },
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn: process.env.REFRESH_TOKEN_LIFE,
            },
        );

        return res.status(200).json({ accessToken: `Bearer ${accessToken}`, refreshToken: `Bearer ${refreshToken}` });
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
            const lastUser = await prisma.users.count();
            const createUser = await prisma.users.create({
                data: {
                    userCheckId: user.id.toString(),
                    nickname: `고민의 늪에 빠진 곰 ${lastUser + 1}`,
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

// 리프레시 토큰 검증 및 재발급 로직
export const refreshController = async (req, res, next) => {
    try {
        const { authorization } = req.body.headers;
        if (!authorization) {
            return res.status(401).json({ message: 'Refresh Token을 전달받지 못했습니다.' });
        }

        const [bearer, refreshToken] = authorization.split(' ');
        if (bearer !== 'Bearer') {
            const err = new Error('토큰 타입이 Bearer 형식이 아닙니다.');
            err.status = 401;
            throw err;
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        if (!decoded) {
            return res.status(409).json({ message: '토큰을 decoded하지 못했습니다.' });
        }
        const user = await prisma.users.findFirst({
            where: {
                userId: decoded.userId,
            },
        });

        if (!user) {
            const err = new Error('토큰의 사용자를 찾을 수 없습니다.');
            err.status = 404;
            throw err;
        }

        const newAccessToken = jwt.sign({ userId: user.userId, planet: user.planet }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: process.env.ACCESS_TOKEN_LIFE,
        });
        const newRefreshToken = jwt.sign(
            { userId: user.userId, planet: user.planet },
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn: process.env.REFRESH_TOKEN_LIFE,
            },
        );

        return res.status(200).json({
            message: '토큰이 재발급 되었습니다',
            accessToken: `Bearer ${newAccessToken}`,
            refreshToken: `Bearer ${newRefreshToken}`,
        });
    } catch (error) {
        next(error);
    }
};

// 좋아요된 고민의 갯수 조회하기
export const WorryCountController = async (req, res, next) => {
    try {
        const userId = res.locals.user.userId;
        // const { userId } = req.body;
        // const solvedWorriesCount = await prisma.worries.count({
        //     where: {
        //         commentAuthorId: +userId, // 이 값은 예시입니다. 실제 commentAuthorId 값으로 대체하세요.
        //         isSolved: true,
        //     },
        // });
        const user = await prisma.users.findUnique({
            where: {
                userId: +userId,
            },
            select: {
                remainingStars: true,
            },
        });
        return res.status(200).json({ remainingStars: user.remainingStars });

        // return res.status(200).json(solvedWorriesCount);
    } catch (error) {
        next(error);
    }
};
