import * as worryService from './worry.service.js';

// 고민 등록
export const createWorryController = async (req, res, next) => {
    try {
        const { content, icon, userId } = req.body; // 나중에 사용자 인증 미들웨어에서 userId로 변경하기


        if (!content || !icon || !userId) return res.status(400).json({ error: '데이터 형식이 올바르지 않습니다' })
  
        const worry = await worryService.createWorry({ content, icon, userId });
        res.status(201).json(worry);
    } catch (error) {
        console.error('고민 등록중 에러가 발생했어요! :', error);
        next(error);

       
    }
};

// 답변자Id에게 해당하는 전체 고민 조회
export const getWorriesByCommentAuthorIdController = async (req, res) => {
    try {
        const { userId } = req.body; // 나중에 사용자 인증 미들웨어에서 userId 가져오는것으로 변경
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

//고민메세지 상세조회
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

// 답변자가 곤란한 고민 삭제하기
export const deleteWorryByCommentAuthorController = async (req, res, next) => {
    try {
        const { worryId } = req.params;
        const { userId } = req.body; // 추후에 사용자 인증 userId로 변경

        const deletedWorry = await worryService.deleteSelectedWorry(+worryId, +userId);
        res.status(200).json({ message: '답변하기 곤란한 걱정이 삭제되었습니다' });
    } catch (error) {
        if (error.message === '해당하는 고민이 존재하지 않습니다') {
            return res.status(404).json({ error: '해당하는 고민이 존재하지 않습니다' });
        } else if (error.message === '답변 대상자만 곤란한 고민을 삭제할 수 있습니다') {
            return res.status(403).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
};
