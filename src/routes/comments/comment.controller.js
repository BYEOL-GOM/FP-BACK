import * as CommentService from './comment.service.js';

// # 답변 전체 조회
export const findLatestCommentsAndWorriesForUserController = async (req, res) => {
    try {
        const userId = res.locals.user.userId;
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

// # 답변 상세조회
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

// # 답장 보내기
export const createReplyController = async (req, res, next) => {
    try {
        const { worryId, commentId } = req.params;
        // const userId = res.locals.user.userId;
        const { content, fontColor, userId } = req.body;

        // 필수 데이터 검증
        if (!worryId || !content || !fontColor) {
            return res.status(400).json({ error: '데이터 형식이 올바르지 않습니다' });
        }

        // 서비스 함수 호출 시 commentId 전달 (이 값은 undefined일 수도 있음)
        const comment = await CommentService.createReply(+worryId, +commentId, content, +userId, fontColor);

        return res.status(201).json({ message: '답변이 전송되었습니다.', comment });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// # 답변하기 곤란한 답장 삭제하기
export const deleteCommentController = async (req, res) => {
    const { commentId } = req.params;
    // const userId = res.locals.user.userId;
    const { userId } = req.body;

    try {
        await CommentService.deleteComment(+commentId, +userId);
        res.status(200).json({ message: '답변이 성공적으로 삭제되었습니다.' });
    } catch (error) {
        if (error.message === '해당하는 답변이 존재하지 않습니다') {
            return res.status(404).json({ error: error.message });
        } else if (error.message === '답장을 삭제할 권한이 없습니다.') {
            return res.status(403).json({ error: error.message });
        } else if (error.message === '해당 답장은 이미 삭제되었습니다') {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};
