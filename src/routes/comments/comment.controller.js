import * as CommentService from './comment.service.js';

// 고민에 대한 댓글 생성
export const createCommentController = async (req, res) => {
    try {
        const { worryId } = req.params;
        const { content, userId } = req.body;
        // const userId = res.locals.user.id;

        console.log('🩵🩵🩵컨트롤러 : ', worryId, content, userId);

        const comment = await CommentService.createComment(worryId, content, userId);
        return res.status(201).json(comment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 댓글에 대한 대댓글 생성
export const createCommentReplyController = async (req, res) => {
    try {
        const { worryId, parentId } = req.params;
        const { content, userId } = req.body;
        // const userId = res.locals.user.id;

        const reply = await CommentService.createReply(worryId, parentId, content, userId);

        return res.status(201).json(reply);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// 답변 조회
export const readCommentController = async (req, res, next) => {};

// 답변 수정
export const updateCommentController = async (req, res, next) => {};

// 답변 삭제
export const deleteCommentController = async (req, res, next) => {};
