export class AppError extends Error {
    constructor(message, statusCode) {
        super(message); // Error 클래스의 constructor 호출
        this.statusCode = statusCode; // HTTP 상태 코드
        this.status = statusCode; // 이제 status도 숫자 상태 코드를 저장
        this.errorStatus = `${statusCode}`.startsWith('4') ? 'fail' : 'error'; // 로깅용 상태 문자열
        this.isOperational = true; // 이 에러가 예측 가능한 에러인지 표시

        Error.captureStackTrace(this, this.constructor);
    }
}
