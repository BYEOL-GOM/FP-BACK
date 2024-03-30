import * as worryRepository from './worry.repository.js';
import { prisma } from '../../utils/prisma/index.js';
import * as CommentRepository from '../comments/comment.repository.js';

//고민 등록
export const createWorry = async ({ content, icon, userId }) => {
    try {
        // 답변자 Id 랜덤으로 지정하기
        const randomAuthorId = await worryRepository.getRandomUser(userId);

        const worry = await worryRepository.createWorry({ content, icon, userId, randomAuthorId });

        // commentAuthorId도 함께 반환
        return { ...worry, commentAuthorId: randomAuthorId };
        // 고민 등록할때 답변자id도 포함
        // return await worryRepository.createWorry({ content, icon, userId, randomAuthorId });
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

// 곤란한 질문 삭제하기
export const deleteSelectedWorry = async (worryId, userId) => {
    const commentAuthorId = await worryRepository.getCommentAuthorId(worryId);
    if (!commentAuthorId) {
        throw new Error('해당하는 고민이 존재하지 않습니다');
    }

    if (commentAuthorId !== userId) {
        throw new Error('답변 대상자만 곤란한 고민을 삭제할 수 있습니다');
    }

    const deletedWorry = await worryRepository.deleteSelectedWorry(worryId);
    return deletedWorry;
};

// 재고민 등록
export const createReWorry = async (worryId, commentId, content, userId) => {
    const originalWorry = await worryRepository.getWorryDetail(worryId);
    if (!originalWorry) throw new Error('해당 고민이 존재하지 않습니다.');
    if (originalWorry.userId !== userId) throw new Error('재고민을 작성할 권한이 없습니다.');

    const originalComment = await CommentRepository.findCommentById(commentId);
    if (!originalComment || originalComment.worryId !== worryId) {
        throw new Error('적절하지 않은 요청입니다.');
    }

    const reWorry = await worryRepository.createComment({
        worryId,
        content,
        userId,
        parentId: commentId, // 이전 답변(댓글)의 ID
    });

    return reWorry;
};

//  재답변 생성
export const createReAnswer = async (worryId, reWorryId, content, userId) => {
    return await worryRepository.createComment({
        worryId: parseInt(worryId),
        content,
        userId,
        parentId: parseInt(reWorryId), // 재고민 ID를 parentId로 설정하여 재답변의 관계를 나타냅니다.
    });
};
