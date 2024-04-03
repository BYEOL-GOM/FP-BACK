import * as CommentService from './comment.service.js';

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

// 답변 상세조회
export const getCommentDetailController = async (req, res) => {
    try {
        const { commentId } = req.params;
        if (!commentId) {
            return res.status(400).json({ error: '데이터 형식이 일치하지 않습니다' });
        }

        const details = await CommentService.getCommentDetail(+commentId);
        res.json(details);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '서버 에러 발생' });
    }
};

// 답장 보내기
export const createReplyController = async (req, res, next) => {
    try {
        const { worryId, commentId } = req.params;
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
