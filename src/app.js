import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import LogMiddleware from './middlewares/logMiddleware.js';
import generalErrorHandler from './middlewares/generalErrorMiddleware.js';
import router from './routes/index.js';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import { loadBannedWords } from './utils/bannedWordsLoader.js';
import { swaggerUi, specs } from './swagger/swaggerOptions.js';
import './scheduler.js';
import validUrl from 'valid-url';
import * as Sentry from '@sentry/node';
import { Integrations } from '@sentry/tracing';

const app = express();

// 환경 변수에서 CONTAINER_PORT를 불러옵니다. 없다면 기본값으로 3000을 사용
const PORT = process.env.CONTAINER_PORT || 3000;

// CORS_ORIGIN 환경 변수가 유효한 URL 형식인지 검증
const corsOrigin = process.env.CORS_ORIGIN;
if (!validUrl.isWebUri(corsOrigin)) {
    console.error('Invalid CORS_ORIGIN:', corsOrigin);
    process.exit(1);
}

// CORS 미들웨어 설정
app.use(
    cors({
        origin: function (origin, callback) {
            const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('CORS not allowed'), false);
            }
        },
        methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Sentry-Auth'],
        credentials: true,
        optionsSuccessStatus: 204,
    }),
);

app.use(bodyParser.json());
app.use(express.json());

app.use(LogMiddleware);
app.use(cookieParser());

app.use('/', router);

// Sentry 초기화
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [new Integrations.Http({ tracing: true }), new Sentry.Integrations.Express({ app })],
    tracesSampleRate: 1.0,
});

// Sentry 미들웨어
app.use(Sentry.Handlers.requestHandler()); // Sentry 요청 핸들러
app.use(Sentry.Handlers.tracingHandler()); // Sentry 트레이싱 핸들러

// AWS Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Server is healthy' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use(generalErrorHandler);
app.use(Sentry.Handlers.errorHandler());

loadBannedWords()
    .then(() => {
        console.log('금지어 목록이 메모리에 로드되었습니다.');
    })
    .catch((error) => {
        console.error('금지어 목록 로딩 중 오류 발생:', error);
    });

// sentry 확인을 위해 의도적으로 에러 발생시키기
app.get('/debug-sentry', function mainHandler(req, res) {
    throw new Error('My first Sentry error!');
});

app.listen(PORT, () => {
    console.log(`${PORT} 포트로 서버가 열렸어요!`);
});
