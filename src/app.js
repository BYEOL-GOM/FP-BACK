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

const app = express();
// 환경 변수에서 PORT를 불러옵니다. 없다면 기본값으로 3000을 사용합니다.
const PORT = process.env.PORT || 3000;

// CORS 미들웨어 설정
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(express.json());

app.use(LogMiddleware);
app.use(cookieParser());

app.use('/', router);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use(generalErrorHandler);

loadBannedWords()
    .then(() => {
        console.log('금지어 목록이 메모리에 로드되었습니다.');
    })
    .catch((error) => {
        console.error('금지어 목록 로딩 중 오류 발생:', error);
    });

app.listen(PORT, () => {
    console.log(`${PORT} 포트로 서버가 열렸어요!`);
});

//
