import * as CommentService from './comment.service.js';
// 고민에 대한 답변 생성

export const createCommentController = async (req, res, next) => {
    try {
        const { worryId } = req.params;
        const { content, userId, fontColor } = req.body;

        if (!worryId || !content || !userId || !fontColor) {
            return res.status(400).json({ error: '데이터 형식이 올바르지 않습니다' });
        }

        const comment = await CommentService.createComment(worryId, content, userId, fontColor);

        // 응답 객체에 필요한 정보 포함
        const InitialComment = {
            worryId: comment.worryId,
            commentId: comment.commentId, // 생성된 댓글의 ID
            commentAuthor: comment.userId,
            createdAt: comment.createdAt,
            // fontColor: comment.fontColor,
        };

        return res.status(201).json({ message: '답변이 전송되었습니다.', InitialComment });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 답변 전체 조회
export const getLatestCommentForUserWorriesController = async (req, res) => {
    try {
        const userId = parseInt(req.body.userId);
        if (!userId) {
            return res.status(400).json({ error: '사용자 ID가 제공되지 않았습니다.' });
        }

        const latestComments = await CommentService.getLatestCommentForUserWorries(userId);
        return res.json(latestComments);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};

// 답변 상세 메세지 조회
export const getCommentDetailController = async (req, res, next) => {
    try {
        const { commentId } = req.params;
        const comment = await CommentService.getCommentDetail(+commentId);
        res.status(200).json(comment);
    } catch (error) {
        res.status(400).json({ error: error.message });

        next(error);
    }
};
