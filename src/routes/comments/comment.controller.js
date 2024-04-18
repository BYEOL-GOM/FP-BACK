import * as commentService from './comment.service.js';

// # 로그인한 유저에게 온 전체 메세지 조회 (매칭된 첫고민 or 이후 답장)
export const getAllLatestMessagesController = async (req, res, next) => {
    try {
        const userId = res.locals.user.userId;
        // const { userId } = req.body;
        const latestMessages = await commentService.getAllLatestMessages(+userId);
        if (latestMessages.length === 0) {
            const error = new Error('아직 메세지가 도착하지 않았습니다');
            error.status = 204;
            throw error;
        }
        return res.json(latestMessages);
    } catch (error) {
        next(error);
    }
};

// # 답장 상세조회
export const getCommentDetailController = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const userId = res.locals.user.userId;
        // const { userId } = req.body;

        if (!commentId) {
            const error = new Error('데이터 형식이 일치하지 않습니다');
            error.status = 400;
            throw error;
        }
        const details = await commentService.getCommentDetail(+commentId, +userId);
        res.json(details);
    } catch (error) {
        next(error);
    }
};

// # 답장 보내기
export const createReplyController = async (req, res, next) => {
    try {
        const { worryId, commentId } = req.params;
        const userId = res.locals.user.userId;
        // const { content, fontColor } = req.body;
        const { content, fontColor } = req.body;

        if (!worryId || !content || !fontColor) {
            const error = new Error('데이터 형식이 일치하지 않습니다');
            error.status = 400;
            throw error;
        }

        const comment = await commentService.createReply(+worryId, +commentId, content, +userId, fontColor);

        return res.status(201).json({ message: '답변이 전송되었습니다.', comment });
    } catch (error) {
        next(error);
    }
};

// # 별 수확하기
export const updateFruitCountController = async (req, res, next) => {
    try {
        // const { userId } = req.body;
        const userId = res.locals.user.userId;
        const result = await commentService.updateFuitCount(+userId);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};
