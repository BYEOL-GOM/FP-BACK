import * as worryService from './worry.service.js';

// # 고민 등록
export const createWorryController = async (req, res, next) => {
    try {
        const { content, icon, fontColor, userId } = req.body;
        // const userId = res.locals.user.userId;

        if (!content || !icon || !fontColor) return res.status(400).json({ error: '데이터 형식이 올바르지 않습니다' });

        const worry = await worryService.createWorry({ content, icon, userId: +userId, fontColor });

        res.status(201).json({
            message: '고민 생성이 완료되었습니다',
            worry: {
                worryId: worry.worryId,
                userId: worry.userId,
                commentAuthorId: worry.commentAuthorId,
                createdAt: worry.createdAt,
                fontColor: worry.fontColor,
                remainingWorries: worry.remainingWorries,
            },
        });
    } catch (error) {
        console.error('고민 등록 중 에러가 발생했어요! :', error);
        res.status(400).json({ error: error.message });
    }
};

// # 전체 고민 조회 by 답변자id
export const getWorriesByCommentAuthorIdController = async (req, res, next) => {
    try {
        const userId = res.locals.user.userId;
        const worries = await worryService.getWorriesByCommentAuthorId(+userId);

        // 만약 고민이 없다면
        if (!worries || worries.length === 0) {
            res.status(404).json({ error: '해당 유저에 할당된 고민목록이 존재하지 않습니다' });
            return;
        }

        res.status(200).json(worries);
    } catch (error) {
        console.error('오류입니당', error);
        res.status(500).json({ error: '오류입니당' });
    }
};

//# 고민메세지 상세조회
export const WorryDetailController = async (req, res, next) => {
    try {
        const { worryId } = req.params;
        if (!worryId) {
            throw new Error('데이터 형식이 올바르지 않아요');
        }
        const worryDetail = await worryService.getWorryDetail(+worryId);

        // 만약 고민 상세정보가 없다면
        if (!worryDetail) {
            res.status(404).json({ error: '해당하는 고민이 존재하지 않습니다' });
        }

        res.status(200).json(worryDetail);
    } catch (error) {
        console.error(error);
        next(error);
    }
};

//오래된 메세지 삭제하기
export const deleteWorryController = async (req, res, next) => {
    try {
        const deletedWorries = await worryService.deleteOldWorries();
        res.status(200).json({ message: '오래된 고민 삭제에 성공했습니다.', deletedWorries });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

// # 답변하기 어려운 고민 삭제하기
export const deleteSelectedWorryController = async (req, res, next) => {
    try {
        const { worryId } = req.params;
        // const userId = res.locals.user.userId;
        const { userId } = req.body;
        if (!worryId) {
            return res.status(400).json({ error: '데이터 형식이 올바르지 않습니다' });
        }

        await worryService.deleteSelectedWorry(+worryId, +userId);

        res.status(200).json({ message: '해당 고민이 삭제되었습니다' });
    } catch (error) {
        if (error.message === '해당하는 고민이 존재하지 않습니다') {
            return res.status(404).json({ error: '해당하는 고민이 존재하지 않습니다' });
        } else if (error.message === '답변 대상자만 곤란한 고민을 삭제할 수 있습니다') {
            return res.status(403).json({ error: error.message });
        } else if (error.message === '해당 고민은 이미 삭제되었습니다') {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

// #불쾌한 고민 신고하기
export const reportWorryController = async (req, res) => {
    try {
        const { worryId } = req.params;
        const { userId, reportReason } = req.body; // 신고 이유

        if (!reportReason) {
            return res.status(400).json({ error: '신고 이유를 작성해주세요.' });
        }

        await worryService.reportWorry(+worryId, +userId, reportReason);
        res.status(200).json({ message: '신고가 성공적으로 이루어졌습니다.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
