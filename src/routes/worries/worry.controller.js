import * as worryService from './worry.service.js';

// # 고민 등록
export const createWorryController = async (req, res, next) => {
    try {
        const { content, icon, fontColor } = req.body;
        const userId = res.locals.user.userId;
        // const { userId, content, icon, fontColor } = req.body;

        if (!content || !icon || !fontColor) {
            const error = new Error('데이터 형식이 올바르지 않습니다');
            error.status = 400;
            throw error;
        }

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
        const { worryId } = req.params;
        const userId = res.locals.user.userId;
        // const { userId } = req.body;

        if (!worryId) {
            const error = new Error('데이터 형식이 올바르지 않습니다');
            error.status = 400;
            throw error;
        }
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
        const { worryId, commentId } = req.params;
        const userId = res.locals.user.userId;
        // const { userId } = req.body;

        if (!worryId) {
            const error = new Error('데이터 형식이 올바르지 않습니다');
            error.status = 400;
            throw error;
        }

        await worryService.deleteSelectedWorry(+worryId, +userId, +commentId);

        res.status(200).json({ message: '메세지가 삭제되었습니다' });
    } catch (error) {
        next(error);
    }
};

// #불쾌한 메세지 신고하기
export const reportMessageController = async (req, res, next) => {
    try {
        const { worryId, commentId } = req.params;
        const userId = res.locals.user.userId;
        const { reportReason } = req.body;

        if (!reportReason) {
            const error = new Error('신고 이유를 작성해주세요.');
            error.status = 400;
            throw error;
        }
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
        // const { userId } = req.body;

        const remainingWorries = await worryService.findRemainingWorriesByUserId(+userId);

        res.json({ remainingWorries });
    } catch (error) {
        next(error);
    }
};
