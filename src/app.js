import express from 'express';
import { Server as HttpServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import validUrl from 'valid-url';
import * as Sentry from '@sentry/node';
import { Integrations } from '@sentry/tracing';

import LogMiddleware from './middlewares/logMiddleware.js';
import generalErrorHandler from './middlewares/generalErrorMiddleware.js';
import router from './routes/index.js';
import { loadBannedWords } from './utils/bannedWordsLoader.js';
import { swaggerUi, specs } from './swagger/swaggerOptions.js';
import './scheduler.js';
import initializeSocket from './socket.js'; // socket.js 파일에서 함수 가져오기
// import { Server as SocketIOServer } from 'socket.io';
// import bodyParser from 'body-parser';
// import { fileURLToPath } from 'url';
// import path from 'path';

// 환경 변수 설정 로드
dotenv.config();

const app = express();
const PORT = process.env.CONTAINER_PORT || 3000;

// Sentry 초기화
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [new Sentry.Integrations.Http({ tracing: false })],
        tracesSampleRate: 1.0,
    });

    // Sentry 요청 및 트레이싱 핸들러를 사용
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
}
// CORS_ORIGIN 환경 변수가 유효한 URL 형식인지 검증
// const corsOrigin = process.env.CORS_ORIGIN;
// if (!validUrl.isWebUri(corsOrigin)) {
//     console.error('Invalid CORS_ORIGIN:', corsOrigin);
//     process.exit(1);
// }

// CORS 미들웨어 설정
const corsOptions = {
    // origin: '*', // 여러 출처 허용
    origin: 'http://localhost:3000', // 여러 출처 허용
    // origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};
app.use(cors(corsOptions));
// // CORS Preflight 요청 처리
// app.use((req, res, next) => {
//     if (req.method === 'OPTIONS') {
//         res.header('Access-Control-Allow-Origin', req.headers.origin);
//         res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//         res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//         return res.status(204).json({});
//     }
//     next();
// });
// CORS Preflight 요청 처리
app.options('*', cors(corsOptions)); // 모든 preflight 요청에 대해 응답

app.use(express.json());
// app.use(bodyParser.json());
app.use(cookieParser());
app.use(LogMiddleware);

app.use('/', router);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// AWS Health Check 서버의 건강 상태 체크
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'Server is healthy' });
});

// Error handlers
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
}
app.use(generalErrorHandler);

// Banned words loader
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

// // ES 모듈에서 __dirname을 구현하는 방법
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// // 이제 __dirname을 사용하여 정적 파일 경로를 설정할 수 있습니다.
// app.use(express.static(path.join(__dirname, '..', 'src')));
//---------------------------------------------------------------------------------------
// const httpServer = new HttpServer(app); // Express 애플리케이션에 대한 HTTP 서버를 생성
// initializeSocket(httpServer); // 여기서 Socket.IO 서버를 초기화하고, 필요한 경우 httpServer를 전달
//---------------------------------------------------------------------------------------
const server = HttpServer(app);
// Socket.IO 서버에도 CORS 적용
const io = initializeSocket(server, corsOptions); // Initialize Socket.IO with CORS
// const io = new SocketIOServer(server, {
//     cors: corsOptions,
// });

// 웹소켓 기본 라우터
app.get('/', (req, res) => {
    res.status(200).json({ message: 'test' });
});

// io.on('connection', (socket) => {
//     console.log('사용자가 연결되었습니다.');
//     console.log(socket.id);
//     socket.emit('연결 성공!', { message: '소켓 연결에 성공했습니다!' });
//     socket.on('join room', ({ roomId }, callback) => {
//         // 'join room' 이벤트를 수신하여 해당 방에 입장 처리를 수행.
//         console.log(`유저가 ${roomId} 방에 입장했습니다.`);
//         // 입장 처리 후 필요한 작업 수행
//     });
//     socket.on('chatting', (data) => {
//         console.log('메시지 수신:', data);
//         // 받은 메시지를 처리하고 필요한 작업을 수행합니다.
//     });
//     socket.on('disconnect', () => {
//         console.log('유저가 나갔습니다.');
//     });
// });

//---------------------------------------------------------------------------------------
// httpServer.listen(PORT, () => {
//     console.log(`${PORT} 포트로 서버가 열렸어요!`);
// });
server.listen(PORT, () => console.log(`${PORT} 포트로 서버가 열렸어요!`));
//---------------------------------------------------------------------------------------
