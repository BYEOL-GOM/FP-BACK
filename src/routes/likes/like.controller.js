import * as LikeService from './like.service.js';

// 마음에 드는 댓글에 선물 보내기
export const sendLike = async (req, res, next) => {
    try {
        const { worryId, commentId } = req.params;
        const userId = Number(res.locals.user.userId);

        const result = await LikeService.sendLike(worryId, commentId, userId);

        return res.status(201).json({ message: '선물을 성공적으로 전달했습니다.', result });
    } catch (error) {
        next(error);
    }
};

// '나의 해결된 고민' 목록 전체 조회
export const getSolvedWorries = async (req, res, next) => {
    try {
        const userId = Number(res.locals.user.userId);
        console.log('🩵🩵🩵컨트롤러 userId : ', userId);

        // 페이지네이션
        const page = parseInt(req.query.page) || 1; // 페이지 번호, 기본값은 1
        const limit = parseInt(req.query.limit) || 10; // 페이지당 항목 수, 기본값은 10

        // 페이지 번호 유효성 검사
        if (isNaN(page) || page < 1) {
            return res.status(400).json({ error: '유효하지 않은 페이지 번호입니다.' });
        }

        const solvedWorries = await LikeService.getSolvedWorriesByUserId(parseInt(userId), page, limit);
        return res.status(200).json(solvedWorries);
    } catch (error) {
        next(error);
    }
};

// '내가 해결한 고민' 목록 전체 조회
export const getHelpedSolveWorries = async (req, res, next) => {
    try {
        const userId = Number(res.locals.user.userId);

        // 페이지네이션
        const page = parseInt(req.query.page) || 1; // 페이지 번호, 기본값은 1
        const limit = parseInt(req.query.limit) || 10; // 페이지당 항목 수, 기본값은 10

        // 페이지 번호 유효성 검사
        if (isNaN(page) || page < 1) {
            return res.status(400).json({ error: '유효하지 않은 페이지 번호입니다.' });
        }

        const helpedSolveWorries = await LikeService.getHelpedSolveWorriesByUserId(parseInt(userId), page, limit);
        res.status(200).json(helpedSolveWorries);
    } catch (error) {
        next(error);
    }
};

// '나의 해결된 고민' 상세 조회
export const getSolvedWorryDetails = async (req, res, next) => {
    try {
        const { worryId } = req.params;
        const userId = Number(res.locals.user.userId);

        if (!worryId) {
            return res.status(400).json({ error: '데이터 형식이 올바르지 않습니다.' });
        }

        const worryDetails = await LikeService.getSolvedWorryDetailsById(+worryId, +userId);
        if (!worryDetails) {
            const err = new Error('해당하는 답변의 고민 게시글이 존재하지 않습니다.');
            err.status = 404;
            throw err;
        }
        return res.status(200).json(worryDetails);
    } catch (error) {
        next(error);
    }
};

// '내가 해결한 고민' 상세 조회
export const getHelpedSolveWorryDetails = async (req, res, next) => {
    try {
        const { worryId } = req.params;
        const userId = Number(res.locals.user.userId);

        if (!worryId) {
            return res.status(400).json({ error: '데이터 형식이 올바르지 않습니다.' });
        }

        const worryDetails = await LikeService.getHelpedSolveWorryDetailsById(+worryId, +userId);

        if (!worryDetails) {
            const err = new Error('해당하는 답변의 고민 게시글이 존재하지 않습니다.');
            err.status = 404;
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
        const topUsers = await LikeService.getTopLikedCommentAuthors();
        return res.json(topUsers);
    } catch (error) {
        next(error);
    }
};
