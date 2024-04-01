import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';

export default async function authMiddleware(req, res, next) {
    try {
        // 1. 클라이언트로부터 헤더의 토큰을 전달 받는다
        const { authorization } = req.headers;

        // 헤더가 존재하지 않으면, 인증된 사용자가 아님
        if (!authorization) {
            return res.status(401).json({ message: '로그인이 필요한 서비스입니다.' });
        }

        // 인증 정보가 있는 경우, 토큰 추출
        const [bearer, token] = authorization.split(' ');
        // // 만약 토큰 타입이 Bearer가 아닐때 오류
        if (bearer !== 'Bearer') {
            return res.status(401).json({ message: '토큰 타입이 Bearer 형식이 아닙니다.' });
        }

        let decodedToken;
        try {
            // JWT를 사용하여 서버에서 발급한 토큰이 유효한지 검증
            decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            // 토큰 관련 에러 처리
            return res.status(401).json({ message: `토큰 검증 오류: ${error.message}` });
        }

        const user = await prisma.users.findUnique({
            where: { userId: decodedToken.userId },
        });

        if (!user) {
            return res.status(404).json({ message: '토큰 사용자가 존재하지 않습니다.' });
        }

        // 사용자 정보를 다음 미들웨어 또는 라우터 핸들러에서 접근할 수 있도록 저장
        res.locals.user = user;

        next();
    } catch (error) {
        // 예상치 못한 에러 처리
        res.status(500).json({ message: '서버 에러 발생', error: error.message });
    }
}
