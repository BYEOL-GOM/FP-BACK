import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';

export default async function likeAuthenticateUserMiddleware(req, res, next) {
    console.log('req : ', req);
    console.log('req.header : ', req.header);
    console.log('req.headers : ', req.headers);
    console.log('req.headers.authorization : ', req.headers.authorization);

    try {
        // 클라이언트로부터 헤더의 액세스토큰을 전달 받는다
        const { authorization } = req.headers;

        console.log('authorization : ', authorization);

        // 인증 정보가 있는 경우, 엑세스 토큰 추출
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
                    console.log('+decodedAccessToken.userId : ', +decodedAccessToken.userId);

                    if (user) {
                        res.locals.user = user;
                        console.log('res.locals.user : ', res.locals.user);
                        console.log('res.locals.user.userId : ', res.locals.user.userId);
                    } else {
                        // 사용자를 찾을 수 없는 경우, 적절한 에러 메시지와 함께 응답
                        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
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
