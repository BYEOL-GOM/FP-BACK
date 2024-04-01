// logMiddleware.js
export default function logMiddleware(req, res, next) {
    try {
        console.log('Received Request:', req.method, req.path);
        console.log('Params: ', req.params);
        console.log('Body:', req.body);
        console.log('Body Type:', typeof req.body); // 본문의 타입을 로깅

        console.log('userId : ', userId);

        // 본문이 객체인 경우 (일반적으로 JSON 요청에서 발생)
        if (typeof req.body === 'object') {
            console.log('Body Keys:', Object.keys(req.body)); // 본문의 키를 로깅
        }
        next(); // 다음 미들웨어 또는 라우터 핸들러로 넘깁니다.
    } catch (error) {
        next(error); // 에러가 발생하면 다음 에러 처리 미들웨어
    }
}
