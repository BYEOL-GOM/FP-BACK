import express from 'express';
import { Server as HttpServer } from 'http';
import cookieParser from 'cookie-parser';
// import kakaoStrategy from './routes/passport/kakaoStrategy.js';
import dotenv from 'dotenv';
import cors from 'cors';
import LogMiddleware from './middlewares/logMiddleware.js';
import generalErrorHandler from './middlewares/generalErrorMiddleware.js';
import router from './routes/index.js';
import bodyParser from 'body-parser';
import { loadBannedWords } from './utils/bannedWordsLoader.js';
import { swaggerUi, specs } from './swagger/swaggerOptions.js';
import initializeSocket from './socket.js';
import { fileURLToPath } from 'url';
import path from 'path';

// 환경 변수 설정 로드
dotenv.config();

const app = express();
const PORT = 3000; // 환경 변수에서 포트를 설정할 수 있도록 변경

const httpServer = new HttpServer(app); // Express 애플리케이션에 대한 HTTP 서버를 생성
initializeSocket(httpServer); // 여기서 Socket.IO 서버를 초기화하고, 필요한 경우 httpServer를 전달

// CORS 미들웨어 설정
app.use(
    cors({
        origin: '*', // 실제 배포시에는 허용할 도메인을 명시적으로 지정하는 것이 좋습니다.
        methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'], // 'Authorization' 헤더 허용
        credentials: true,
    }),
);

// CORS Preflight 요청에 대한 처리를 위한 미들웨어 추가
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(204).json({});
    }
    next();
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(204).json({});
    }
    next();
});

// bodyParser와 express.json()은 CORS 설정 바로 다음에 위치해야 합니다.
app.use(bodyParser.json());
app.use(express.json());

// 로깅 및 쿠키 파서 미들웨어
app.use(LogMiddleware);
app.use(cookieParser());

// Passport 초기화 및 라우팅 설정
// app.use(passport.initialize()); // Passport를 사용하는 경우 초기화 필요
app.use('/', router);

// 스웨거 설정
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// // ES 모듈에서 __dirname을 구현하는 방법
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 이제 __dirname을 사용하여 정적 파일 경로를 설정할 수 있습니다.
app.use(express.static(path.join(__dirname, '..', 'src')));

// 에러 핸들링 미들웨어는 가장 마지막에 위치
app.use(generalErrorHandler);

// 금지어 목록 로드
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
