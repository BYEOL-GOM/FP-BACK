import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';

export default async function authenticateUserMiddleware(req, res, next) {
    try {
        // 1. 클라이언트로부터 헤더의 액세스토큰을 전달 받는다
        const { authorization } = req.headers;

        // 헤더가 존재하지 않으면, 인증된 사용자가 아님
        if (!authorization) return res.status(401).json({ message: '로그인이 필요한 서비스입니다' });

        // 인증 정보가 있는 경우, 엑세스 토큰 추출
        const [bearer, accessToken] = authorization.split(' ');
        // // 만약 토큰 타입이 Bearer가 아닐때 오류
        if (bearer !== 'Bearer') return res.status(401).json({ message: '토큰 타입이 Bearer 형식이 아닙니다' });

        // 엑세스 토큰을 확인하고 사용자 ID를 추출
        let decodedAccessToken;
        try {
            // JWT를 사용하여 서버에서 발급한 토큰이 유효한지 검증
            decodedAccessToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        } catch (error) {
            // 엑세스 토큰이 만료된 경우 에러 띄우기
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Access Token이 만료되었습니다.' });
            } else {
                throw error;
            }
        }

        const user = await prisma.users.findUnique({
            where: {
                userId: +decodedAccessToken.userId,
                // email: decodedAccessToken.email,
                // nickname: decodedAccessToken.nickname,
            },
        });

        if (!user) {
            throw new Error('토큰 사용자가 존재하지 않습니다');
        }

        res.locals.user = user;

        next();
    } catch (error) {
        next(error);
    }
}
