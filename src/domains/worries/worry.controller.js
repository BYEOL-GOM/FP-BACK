import * as worryService from './worry.service.js';
import { createWorrySchema, worryIdSchema, worryParamsSchema, reportReasonSchema } from './worry.joi.js';
import { AppError } from '../../utils/AppError.js';

// # 고민 등록
export const createWorryController = async (req, res, next) => {
    try {
        const { value, error } = createWorrySchema.validate(req.body);
        if (error) {
            throw new AppError('데이터 형식이 일치하지 않습니다', 400);
        }
        const { content, icon, fontColor } = value;
        const userId = res.locals.user.userId;

        const worry = await worryService.createWorry(content, icon, +userId, fontColor);

        res.status(201).json({
            message: '고민 생성이 완료되었습니다',
            worry,
        });
    } catch (error) {
        next(error);
    }
};

// # 고민메세지 상세조회
export const worryDetailController = async (req, res, next) => {
    try {
        const { value, error } = worryIdSchema.validate(req.params);
        if (error) {
            throw new AppError('데이터 형식이 일치하지 않습니다', 400);
        }
        const { worryId } = value;
        const userId = res.locals.user.userId;

        const worryDetail = await worryService.getWorryDetail(+worryId, +userId);
        res.status(200).json(worryDetail);
    } catch (error) {
        next(error);
    }
};

// # 오래된 메세지 삭제하기
export const deleteOldMessagesController = async (req, res, next) => {
    try {
        const deletedCount = await worryService.deleteOldMessages();
        res.status(200).json({ message: '오래된 고민 삭제에 성공했습니다.', deletedCount });
    } catch (error) {
        next(error);
    }
};

// # 곤란한 메세지 선택 삭제
export const deleteSelectedWorryController = async (req, res, next) => {
    try {
        const { value, error } = worryParamsSchema.validate(req.params);
        if (error) {
            throw new AppError('데이터 형식이 일치하지 않습니다', 400);
        }
        const { worryId, commentId } = value;
        const userId = res.locals.user.userId;

        await worryService.deleteSelectedWorry(+worryId, +userId, +commentId);

        res.status(200).json({ message: '메세지가 삭제되었습니다' });
    } catch (error) {
        next(error);
    }
};

// #불쾌한 메세지 신고하기
export const reportMessageController = async (req, res, next) => {
    try {
        const { value: paramsValue, error: paramsError } = worryParamsSchema.validate(req.params);
        if (paramsError) {
            throw new AppError('데이터 형식이 일치하지 않습니다', 400);
        }
        const { worryId, commentId } = paramsValue;
        const userId = res.locals.user.userId;

        const { value: bodyValue, error: bodyError } = reportReasonSchema.validate(req.body);
        if (bodyError) {
            throw new AppError('신고 이유를 작성해주세요.', 400);
        }
        const { reportReason } = bodyValue;

        await worryService.reportMessage(+worryId, userId, +commentId || null, reportReason);

        res.status(200).json({ message: '신고가 성공적으로 이루어졌습니다.' });
    } catch (error) {
        next(error);
    }
};

// 유저의 로켓 개수 확인하기
export const getRemainingWorries = async (req, res, next) => {
    try {
        const userId = res.locals.user.userId;
        const remainingWorries = await worryService.findRemainingWorriesByUserId(+userId);

        res.json({ remainingWorries });
    } catch (error) {
        next(error);
    }
};
