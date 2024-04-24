import * as LikeService from './like.service.js';
import { paramsSchema, likeSchema, worryIdSchema } from './like.joi.js';

// 마음에 드는 댓글에 선물 보내기
export const sendLike = async (req, res, next) => {
    try {
        // URL 파라미터 검사
        const { error: paramsError } = paramsSchema.validate(req.params);
        if (paramsError) {
            const err = new Error('URL 파라미터 검증 실패');
            err.status = 400;
            err.details = paramsError.details; // Joi에서 제공하는 상세 에러 정보 추가
            throw err; // 에러를 throw
        }

        // 요청 본문의 유효성 검사
        const { error } = likeSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const err = new Error('입력 값 검증 실패');
            err.status = 400;
            err.details = error.details; // Joi에서 제공하는 상세 에러 정보 추가
            throw err; // 에러를 throw
        }

        const { worryId, commentId } = req.params;
        const content = req.body.content;
        // const userId = parseInt(res.locals.user.userId);
        const userId = parseInt(req.body.userId, 10);

        const result = await LikeService.sendLike(worryId, commentId, userId, content);

        console.log('🩵🩵🩵컨트롤러 result : ', result);

        return res.status(201).json({ message: '선물을 성공적으로 전달했습니다.', result });
    } catch (error) {
        next(error);
    }
};

// '나의 해결된 고민' 목록 전체 조회 -> '내가 등록한 고민' 목록 전체 조회
export const getSolvedWorries = async (req, res, next) => {
    try {
        // const userId = parseInt(res.locals.user.userId);
        const userId = parseInt(req.body.userId);

        // 페이지네이션
        const page = parseInt(req.query.page) || 1; // 페이지 번호, 기본값은 1
        const limit = parseInt(req.query.limit) || 10; // 페이지당 항목 수, 기본값은 10

        // 페이지 번호 유효성 검사
        if (isNaN(page) || page < 1) {
            const err = new Error('유효하지 않은 페이지 번호입니다.');
            err.status = 400;
            throw err;
        }

        const solvedWorries = await LikeService.getSolvedWorriesByUserId(parseInt(userId), page, limit);

        // API 응답 전에 데이터 로깅
        console.log('🩵🩵🩵Final response data:', JSON.stringify(solvedWorries, null, 2));
        console.log('🩵🩵', solvedWorries);

        // 고민이 없을 때 빈 배열 반환
        if (solvedWorries.worries.length === 0) {
            return res.status(200).json([]);
        }

        return res.status(200).json(solvedWorries);
    } catch (error) {
        next(error);
    }
};

// '내가 해결한 고민' 목록 전체 조회 -> '내가 답변한 고민' 목록 전체 조회
export const getHelpedSolveWorries = async (req, res, next) => {
    try {
        // const userId = parseInt(res.locals.user.userId);
        const userId = parseInt(req.body.userId);

        // 페이지네이션
        const page = parseInt(req.query.page) || 1; // 페이지 번호, 기본값은 1
        const limit = parseInt(req.query.limit) || 10; // 페이지당 항목 수, 기본값은 10

        // 페이지 번호 유효성 검사
        if (isNaN(page) || page < 1) {
            const err = new Error('유효하지 않은 페이지 번호입니다.');
            err.status = 400;
            throw err;
        }

        const helpedSolveWorries = await LikeService.getHelpedSolveWorriesByUserId(parseInt(userId), page, limit);

        // 고민이 없을 때 빈 배열 반환
        if (helpedSolveWorries.worries.length === 0) {
            return res.status(200).json([]);
        }

        res.status(200).json(helpedSolveWorries);
    } catch (error) {
        next(error);
    }
};

// '나의 해결된 고민' 상세 조회 -> '내가 등록한 고민' 상세 조회
export const getSolvedWorryDetails = async (req, res, next) => {
    try {
        // 요청의 params에서 worryId 추출 및 유효성 검사
        const { value, error } = worryIdSchema.validate({ worryId: req.params.worryId });
        if (error) {
            const err = new Error('유효하지 않은 고민 게시글 ID입니다.');
            err.status = 400;
            err.details = error.details;
            throw err;
        }

        const worryId = value.worryId; // 직접 변환된 값 사용
        // const userId = parseInt(res.locals.user.userId);
        const userId = parseInt(req.body.userId);

        const worryDetails = await LikeService.getSolvedWorryDetailsById(+worryId, +userId);

        if (!worryDetails) {
            const err = new Error('해당하는 고민 게시글을 찾을 수 없습니다.');
            err.status = 404;
            throw err;
        }

        // 접근 권한 에러
        if (worryDetails.userId !== userId) {
            const err = new Error('이 고민 게시글에 접근할 권한이 없습니다.');
            err.status = 403;
            throw err;
        }

        return res.status(200).json(worryDetails);
    } catch (error) {
        next(error);
    }
};

// '내가 해결한 고민' 상세 조회 -> '내가 답변한 고민' 상세 조회
export const getHelpedSolveWorryDetails = async (req, res, next) => {
    try {
        // 요청의 params에서 worryId 추출 및 유효성 검사
        const { value, error } = worryIdSchema.validate({ worryId: req.params.worryId });
        if (error) {
            const err = new Error('유효하지 않은 고민 게시글 ID입니다.');
            err.status = 400;
            err.details = error.details;
            throw err;
        }

        const worryId = value.worryId; // 직접 변환된 값 사용
        // const userId = parseInt(res.locals.user.userId);
        const userId = parseInt(req.body.userId);

        const worryDetails = await LikeService.getHelpedSolveWorryDetailsById(+worryId, +userId);

        if (!worryDetails) {
            const err = new Error('해당하는 고민 게시글을 찾을 수 없습니다.');
            err.status = 404;
            throw err;
        }

        if (worryDetails.commentAuthorId !== userId) {
            const err = new Error('이 고민을 해결한 사용자만 접근이 가능합니다.');
            err.status = 403;
            throw err;
        }

        return res.status(200).json(worryDetails);
    } catch (error) {
        next(error);
    }
};

// 좋아요를 가장 많이 받은 탑 5위 댓글 조회
export const getTopLikedCommentAuthors = async (req, res, next) => {
    try {
        // 로그인한 사용자가 있다면, 그 사용자의 ID를 가져오기.
        const userId = parseInt(res.locals.user.userId);
        // const userId = parseInt(req.body.userId);

        const topUsers = await LikeService.getTopLikedCommentAuthors(userId);

        // 결과가 없는 경우 빈 배열 반환
        return res.json(topUsers || []);
    } catch (error) {
        next(error);
    }
};
