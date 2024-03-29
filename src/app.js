import express from 'express';
import cookieParser from 'cookie-parser';
import kakaoStrategy from './routes/passport/kakaoStrategy.js';
import dotenv from 'dotenv';
import cors from 'cors';
import LogMiddleware from './middlewares/logMiddleware.js';
import generalErrorHandler from './middlewares/generalErrorMiddleware.js';
import router from './routes/index.js';
import passport from 'passport';

const app = express();
const PORT = 3000;

app.use(LogMiddleware);
app.use(
    cors({
        origin: '*', // 허용할 도메인 목록
        credentials: true, // 쿠키를 포함한 요청을 허용
    }),
);

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());
passportConfig(passport);

app.use('/auth', router);
app.use(generalErrorHandler);

kakaoStrategy()

app.listen(PORT, () => {
    console.log(`${PORT} 포트로 서버가 열렸어요!`);
});
