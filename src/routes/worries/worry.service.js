import * as worryRepository from './worry.repository.js';

//고민 등록
export const createWorry = async ({ content, icon, userId }) => {
    try {
        // 답변자 Id 랜덤으로 지정하기
        const randomAuthorId = await worryRepository.getRandomUser(userId);

        // 고민 등록할때 답변자id도 포함
        return await worryRepository.createWorry({ content, icon, userId, randomAuthorId });
    } catch (error) {
        throw new Error('고민 등록 실패' + error.message);
    }
};

// 답변자Id 기준 고민 전체 조회
export const getWorriesByCommentAuthorId = async (userId) => {
    try {
        const worries = await worryRepository.getWorriesByCommentAuthorId(userId);
        return worries;
    } catch (error) {
        throw new Error('Error in worry service: ' + error.message);
    }
};

// 고민 상세조회
export const getWorryDetail = async (worryId) => {
    try {
        return await worryRepository.getWorryDetail(worryId);
    } catch (error) {
        throw new Error('고민 상세조회 실패: ' + error.message);
    }
};

// 오래된 댓글이 없는 고민 삭제
export const deleteOldWorries = async () => {
    try {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        // Find worries that have no comments and were created more than 10 minutes ago
        const oldWorries = await worryRepository.getOldWorries(tenMinutesAgo);

        // Soft delete old worries
        await worryRepository.softDeleteWorries(oldWorries);

        console.log('오래된 고민 삭제 성공');
    } catch (error) {
        throw new Error('Failed to delete old worries: ' + error.message);
    }
};
