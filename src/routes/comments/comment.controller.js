import * as CommentService from './comment.service.js';

// 고민에 대한 답변 생성
export const createCommentController = async (req, res, next) => {
    try {
        const { worryId } = req.params;
        const { content, userId } = req.body;
        // const userId = res.locals.user.id;

        console.log('🩵🩵🩵컨트롤러 : ', worryId, content, userId);

        const comment = await CommentService.createComment(worryId, content, userId);
        return res.status(201).json({ message: '답변이 등록되었습니다.' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 답변 전체 조회 (고민작성자(=로그인유저) 도착할 댓글 목록)
export const getCommentsByUserIdController = async (req, res, next) => {
    try {
        const { userId } = req.body; // 나중에 사용자 인증미들웨어로 받아오는것으로 변경 = 로그인한 유저(=고민작성자)
        const comments = await CommentService.getCommentsByUserId(+userId);
        res.status(200).json(comments);
    } catch (error) {
        res.status(400).json({ error: error.message });

        next(error);
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

// // 댓글에 대한 대댓글 생성
// export const createCommentReplyController = async (req, res, next) => {
//     try {
//         const { worryId, parentId } = req.params;
//         const { content, userId } = req.body;
//         // const userId = res.locals.user.id;

//         const reply = await CommentService.createReply(worryId, parentId, content, userId);

//         return res.status(201).json(reply);
//     } catch (error) {
//         res.status(400).json({ error: error.message });
//     }
// };

// // 답변 삭제
// export const deleteCommentController = async (req, res, next) => {};
