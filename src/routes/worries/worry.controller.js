import * as worryService from './worry.service.js';

// 고민 등록
export const createWorryController = async (req, res, next) => {
    try {
        const { content, icon, userId } = req.body;
        const worry = await worryService.createWorry({ content, icon, userId });
        res.status(201).json({ worry });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

//고민 전송과 상세보기
export const sendWorryDetailController = async (req, res, next) => {
    try {
        const { worryId } = req.params;
        const worryDetail = await worryService.getWorryDetail(+worryId);
        res.status(200).json({ worryDetail });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

//오래된 메세지 삭제하기
export const deleteWorryController = async (req, res, next) => {
    try {
        const { worryId } = req.params;
        await worryService.deleteWorryService(+worryId);
        res.status(204).end();
    } catch (error) {
        console.error(error);
        next(error);
    }
};
