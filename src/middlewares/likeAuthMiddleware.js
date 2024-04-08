import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';

export default async function likeAuthenticateUserMiddleware(req, res, next) {
    try {
        const { authorization } = req.headers;

        if (authorization) {
            const [bearer, accessToken] = authorization.split(' ');
            if (bearer === 'Bearer') {
                try {
                    const decodedAccessToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
                    const user = await prisma.users.findUnique({
                        where: {
                            userId: +decodedAccessToken.userId,
                        },
                    });

                    if (user) {
                        res.locals.user = user;
                    }
                } catch (error) {
                    // 토큰 검증 실패 (만료 등) 시에도 에러를 발생시키지 않고, 요청을 계속 진행
                    console.log('토큰 검증 실패: ', error.message);
                }
            }
        }

        next();
    } catch (error) {
        next(error);
    }
}
