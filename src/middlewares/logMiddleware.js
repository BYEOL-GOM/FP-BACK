import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';

const transports = [];

if (process.env.NODE_ENV === 'production') {
    // 정보 수준의 로그를 위한 트랜스포트
    const infoFileTransport = new winstonDaily({
        level: 'info', // 'info' 이하 레벨의 로그를 기록
        dirname: 'logs/info', // 로그 파일을 저장할 디렉터리
        filename: '%DATE%-info.log', // 로그 파일의 이름 형식
        datePattern: 'YYYY-MM-DD', // 파일 이름에 사용될 날짜 형식
        zippedArchive: true, // 로그 파일을 압축
        maxSize: '20m', // 파일 최대 크기
        maxFiles: '14d', // 파일 보관 기간
    });

    // 에러 수준의 로그를 위한 트랜스포트
    const errorFileTransport = new winstonDaily({
        level: 'error', // 'error' 레벨 로그만 기록
        dirname: 'logs/error', // 로그 파일을 저장할 디렉터리
        filename: '%DATE%-error.log', // 로그 파일의 이름 형식
        datePattern: 'YYYY-MM-DD', // 파일 이름에 사용될 날짜 형식
        zippedArchive: true, // 로그 파일을 압축
        maxSize: '20m', // 파일 최대 크기
        maxFiles: '14d', // 파일 보관 기간
    });

    // 파일 로그 트랜스포트를 로거에 추가
    transports.push(infoFileTransport, errorFileTransport);
}

// 콘솔에 로그를 출력하기 위한 트랜스포트는 항상 활성화
transports.push(new winston.transports.Console());

const logger = winston.createLogger({
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()), // 로그 형식 정의: 타임스탬프와 JSON
    transports: transports, // 로거에 추가할 트랜스포트 설정
});

export { logger };

export default function (req, res, next) {
    const start = new Date().getTime(); // 요청 처리 시작 시간

    res.on('finish', () => {
        // 요청 처리 완료 시
        const duration = new Date().getTime() - start; // 요청 처리 시간 계산
        const logMessage = `Method: ${req.method}, URL: ${req.url}, Status: ${res.statusCode}, Duration: ${duration}ms`; // 로그 메시지 형식

        if (process.env.NODE_ENV === 'production') {
            logger.info(logMessage); // 배포 환경에서는 파일에 로그 기록
        } else {
            console.log(logMessage); // 개발 환경에서는 콘솔에 로그 출력
        }
    });

    next(); // 다음 미들웨어로 제어를 넘김
}
