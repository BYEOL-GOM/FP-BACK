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
export const findLatestCommentsAndWorriesForUserController = async (req, res) => {
    try {
        const userId = parseInt(req.body.userId);
        // if (!userId) {
        //     return res.status(400).json({ error: '사용자 ID가 제공되지 않았습니다.' });
        // } // 사용자인증 미들웨어로 처리

        const latestComments = await CommentService.findLatestCommentsAndWorriesForUser(+userId);
        if (latestComments.length === 0) {
            return res.status(404).json({ error: '아직 답변이 도착하지 않았습니다' });
        }

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

// 답장보내기
export const createReplyController = async (req, res, next) => {
    try {
        const { worryId, commentId } = req.params; // commentId 추가
        const { content, userId, fontColor } = req.body;

        // 필수 데이터 검증
        if (!worryId || !content || !userId || !fontColor) {
            return res.status(400).json({ error: '데이터 형식이 올바르지 않습니다' });
        }

        // 서비스 함수 호출 시 commentId 전달 (이 값은 undefined일 수도 있음)
        const comment = await CommentService.createReply(+worryId, +commentId, content, +userId, fontColor);

        return res.status(201).json({ message: '답변이 전송되었습니다.', comment });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
