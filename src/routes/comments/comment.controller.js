import * as commentService from './comment.service.js';

// # 로그인한 유저에게 온 전체 메세지 조회 (매칭된 첫고민 or 이후 답장)
export const getAllLatestMessagesController = async (req, res) => {
    try {
        const userId = res.locals.user.userId;
        // const { userId } = req.body;
        const latestMessages = await commentService.getAllLatestMessages(+userId);
        if (latestMessages.length === 0) {
            return res.status(204).json({ error: '아직 메세지가 도착하지 않았습니다' });
        }

        return res.json(latestMessages);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};

// # 답장 상세조회
export const getCommentDetailController = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = res.locals.user.userId;
        // const { userId } = req.body;

        if (!commentId) {
            return res.status(400).json({ error: '데이터 형식이 일치하지 않습니다' });
        }

        const details = await commentService.getCommentDetail(+commentId, +userId);
        res.json(details);
    } catch (error) {
        if (error.message === '해당하는 답장이 존재하지 않습니다') {
            return res.status(404).json({ error: error.message });
        } else if (error.message === '답장을 조회할 권한이 없습니다.') {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

// # 답장 보내기
export const createReplyController = async (req, res, next) => {
    try {
        const { worryId, commentId } = req.params;
        const userId = res.locals.user.userId;
        const { content, fontColor } = req.body;
        // const { userId, content, fontColor } = req.body;

        if (!worryId || !content || !fontColor) {
            return res.status(400).json({ error: '데이터 형식이 올바르지 않습니다' });
        }

        const comment = await commentService.createReply(+worryId, +commentId, content, +userId, fontColor);

        return res.status(201).json({ message: '답변이 전송되었습니다.', comment });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// // # 불쾌한 답장 신고하기
// export const reportCommentController = async (req, res, next) => {
//     const { commentId } = req.params;
//     const userId = res.locals.user.userId;
//     const { reportReason } = req.body;

//     try {
//         await commentService.reportComment(+commentId, +userId, reportReason);
//         res.status(200).json({ message: '답변이 성공적으로 신고되었습니다.' });
//     } catch (error) {
//         if (error.message === '해당하는 답장이 존재하지 않습니다') {
//             return res.status(404).json({ error: error.message });
//         } else if (error.message === '답장을 신고할 권한이 없습니다.') {
//             return res.status(403).json({ error: error.message });
//         } else if (error.message === '해당 답장은 이미 신고되었습니다') {
//             return res.status(409).json({ error: error.message });
//         }
//         res.status(500).json({ error: error.message });
//     }
// };
