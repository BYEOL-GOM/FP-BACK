import passport from 'passport';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import { prisma } from '../../utils/prisma/index.js';
import jwt from 'jsonwebtoken';

export default () => {
    passport.use(
        new KakaoStrategy(
            {
                clientID: process.env.KAKAO_REST_API_KEY,
                callbackURL: process.env.KAKAO_REDIRECT_URI, // 카카오 로그인 Redirect URI 경로
            },
            async (accessToken, refreshToken, profile, done) => {
                console.log('kakao profile', profile);
                try {
                    const email = profile._json.kakao_account.email;
                    const nickname = profile._json.properties.nickname;
                    console.log(email, nickname);
                    const exUser = await prisma.users.findFirst({
                        where: { userCheckId: `${profile.id}` },
                    });

                    let user = exUser;
                    // 이미 가입된 카카오 프로필이면 성공
                    if (!exUser) {
                        // 가입되지 않는 유저면 회원가입 시키고 로그인을 시킨다
                        user = await prisma.users.create({
                            data: {
                                email: email,
                                nickname: nickname,
                                userCheckId: `${profile.id}`,
                            },
                        });
                    }

                    //JWT 토큰 생성
                    const token = jwt.sign(
                        { userId: user.userId },
                        process.env.JWT_SECRET, // JWT 비밀키
                        { expiresIn: '24h' }, // 토큰 유효 시간
                    );

                    // done 함수를 통해 사용자 정보와 토큰을 다음 단계로 전달
                    done(null, token);
                } catch (error) {
                    console.error(error);
                    done(error);
                }
            },
        ),
    );
};
