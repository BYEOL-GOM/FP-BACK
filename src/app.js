import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import LogMiddleware from './middlewares/logMiddleware.js';
import generalErrorHandler from './middlewares/generalErrorMiddleware.js';
import router from './domains/index.js';
import jwt from 'jsonwebtoken';
import bodyParser from 'body-parser';
import { loadBannedWords } from './utils/bannedWordsLoader.js';
import { swaggerUi, specs } from './swagger/swaggerOptions.js';
import './scheduler.js';
import validUrl from 'valid-url';
import morgan from 'morgan';
import * as Sentry from '@sentry/node';
import { Integrations } from '@sentry/tracing';

const app = express();

const PORT = process.env.CONTAINER_PORT || 3000;

// Sentry 초기화
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [new Sentry.Integrations.Http({ tracing: true })],
        tracesSampleRate: 1.0,
    });

    // Sentry 요청 및 트레이싱 핸들러를 사용
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
}
// // // CORS_ORIGIN 환경 변수가 유효한 URL 형식인지 검증

// const corsOrigin = process.env.CORS_ORIGIN;
// if (!validUrl.isWebUri(corsOrigin)) {
//     console.error('Invalid CORS_ORIGIN:', corsOrigin);
//     process.exit(1);
// }

// CORS 미들웨어 설정
app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    }),
);

// CORS Preflight 요청 처리
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(204).json({});
    }
    next();
});

app.use(
    morgan(
        ':method :url :status :res[content-length] - :response-time ms :req[origin] :res[access-control-allow-origin]',
    ),
);

app.use(bodyParser.json());
app.use(express.json());

app.use(LogMiddleware);
app.use(cookieParser());

app.use('/', router);

if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
}

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use(generalErrorHandler);

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

app.get('/', (req, res) => {
    res.status(200).json({ message: 'hi, test OK' });
});

app.listen(PORT, () => {
    console.log(`${PORT} 포트로 서버가 열렸어요!`);
});
