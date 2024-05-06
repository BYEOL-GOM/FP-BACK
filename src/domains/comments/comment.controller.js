import * as commentService from './comment.service.js';
import { replyParamsSchema, replyBodySchema, commentDetailSchema } from './comment.joi.js';
import { AppError } from '../../utils/AppError.js';

// # 로그인한 유저에게 온 전체 메세지 조회 (매칭된 첫고민 or 이후 답장)
export const getAllLatestMessagesController = async (req, res, next) => {
    try {
        const userId = res.locals.user.userId;
        const latestMessages = await commentService.getAllLatestMessages(+userId);
        return res.json(latestMessages);
    } catch (error) {
        next(error);
    }
};

// # 답장 상세조회
export const getCommentDetailController = async (req, res, next) => {
    try {
        const { value, error } = commentDetailSchema.validate(req.params);
        if (error) {
            throw new AppError('데이터 형식이 일치하지 않습니다', 400);
        }
        const { commentId } = value;
        const userId = res.locals.user.userId;

        const details = await commentService.getCommentDetail(+commentId, +userId);
        res.json(details);
    } catch (error) {
        next(error);
    }
};

// # 답장 보내기
export const createReplyController = async (req, res, next) => {
    try {
        const { value: paramsValue, error: paramsError } = replyParamsSchema.validate(req.params);
        const { value: bodyValue, error: bodyError } = replyBodySchema.validate(req.body);
        if (paramsError || bodyError) {
            throw new AppError('데이터 형식이 일치하지 않습니다', 400);
        }

        const { worryId, commentId } = paramsValue;
        const { content, fontColor } = bodyValue;
        const userId = res.locals.user.userId;

        const comment = await commentService.createReply(+worryId, +commentId, content, +userId, fontColor);

        return res.status(201).json({ message: '답변이 전송되었습니다.', comment });
    } catch (error) {
        next(error);
    }
};

// # 별 수확하기
export const updateFruitCountController = async (req, res, next) => {
    try {
        const userId = res.locals.user.userId;
        const result = await commentService.updateFuitCount(+userId);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
};
