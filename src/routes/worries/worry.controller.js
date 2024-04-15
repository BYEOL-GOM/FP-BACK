import * as worryService from './worry.service.js';

// # 고민 등록
export const createWorryController = async (req, res, next) => {
    try {
        const { content, icon, fontColor } = req.body;
        const userId = res.locals.user.userId;
        // const { userId, content, icon, fontColor } = req.body;

        if (!content || !icon || !fontColor) return res.status(400).json({ error: '데이터 형식이 올바르지 않습니다' });

        const worry = await worryService.createWorry(content, icon, +userId, fontColor);

        res.status(201).json({
            message: '고민 생성이 완료되었습니다',
            worry,
        });
    } catch (error) {
        console.error('고민 등록 중 에러가 발생했어요! :', error);
        res.status(400).json({ error: error.message });
    }
};

// # 고민메세지 상세조회
export const WorryDetailController = async (req, res, next) => {
    try {
        const { worryId } = req.params;
        const userId = res.locals.user.userId;
        // const { userId } = req.body;

        if (!worryId) {
            throw new Error('데이터 형식이 올바르지 않습니다');
        }
        const worryDetail = await worryService.getWorryDetail(+worryId, +userId);
        res.status(200).json(worryDetail);
    } catch (error) {
        if (error.message === '해당하는 고민이 존재하지 않습니다') {
            return res.status(404).json({ error: '해당하는 고민이 존재하지 않습니다' });
        } else if (error.message === '고민을 조회할 권한이 없습니다 ') {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

// # 오래된 메세지 삭제하기
export const deleteOldMessagesController = async (req, res, next) => {
    try {
        const deletedCount = await worryService.deleteOldMessages();
        res.status(200).json({ message: '오래된 고민 삭제에 성공했습니다.', deletedCount });
    } catch (error) {
        console.error(error);
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
            return res.status(400).json({ error: '데이터 형식이 올바르지 않습니다' });
        }

        await worryService.deleteSelectedWorry(+worryId, +userId, +commentId);

        res.status(200).json({ message: '메세지가 삭제되었습니다' });
    } catch (error) {
        if (error.message === '해당하는 메세지가 존재하지 않습니다') {
            return res.status(404).json({ error: error.message });
        } else if (error.message === '메세지를 신고할수 있는 권한이 없습니다') {
            return res.status(403).json({ error: error.message });
        } else if (error.message === '해당 메세지는 이미 삭제되었습니다') {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

// #불쾌한 메세지 신고하기
export const reportMessageController = async (req, res) => {
    try {
        const { worryId, commentId } = req.params;
        const userId = res.locals.user.userId;
        const { reportReason } = req.body;

        if (!reportReason) {
            return res.status(400).json({ error: '신고 이유를 작성해주세요.' });
        }

        await worryService.reportMessage(+worryId, userId, +commentId || null, reportReason);

        res.status(200).json({ message: '신고가 성공적으로 이루어졌습니다.' });
    } catch (error) {
        if (error.message === '해당하는 메세지가 존재하지 않습니다') {
            return res.status(404).json({ error: error.message });
        } else if (error.message === '메세지를 신고할수 있는 권한이 없습니다') {
            return res.status(403).json({ error: error.message });
        } else if (error.message === '해당 메세지는 이미 신고되었습니다') {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};

// 유저의 로켓 개수 확인하기
export const getRemainingWorries = async (req, res) => {
    try {
        const userId = res.locals.user.userId;
        // const { userId } = req.body;

        const remainingWorries = await worryService.findRemainingWorriesByUserId(+userId);

        res.json({ remainingWorries });
    } catch (error) {
        res.status(500).send({ message: 'Internal server error' });
    }
};
