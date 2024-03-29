import * as worryRepository from './worry.repository.js';
import { prisma } from '../../utils/prisma/index.js';

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

// // 댓글이 없는 오래된 고민 삭제
export const deleteOldWorries = async () => {
    try {
        const worries = await worryRepository.findOldWorriesWithoutComments();

        for (const worry of worries) {
            const { worryId } = worry;
            await worryRepository.softDeleteWorryById(worryId);
        }

        // return worries;
    } catch (error) {
        console.error('오래된 댓글 삭제에 실패했습니다.', error);
        throw error;
    }
};
