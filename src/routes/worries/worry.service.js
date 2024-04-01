import * as worryRepository from './worry.repository.js';
import { prisma } from '../../utils/prisma/index.js';

//고민 등록
export const createWorry = async ({ content, icon, userId, fontColor }) => {
    try {
        // 사용자 정보와 남은 고민 횟수를 확인합니다.
        const user = await worryRepository.getUserById(userId);
        if (!user || user.remainingWorries <= 0) {
            throw new Error('최대 고민 작성수를 초과하였습니다');
        }

        // 답변자 Id 랜덤으로 지정하기 및 답변 가능 여부 확인
        const randomAuthorId = await worryRepository.getRandomUser(userId);

        // 고민 생성
        const worry = await worryRepository.createWorry({ content, icon, userId, randomAuthorId, fontColor });

        // 사용자의 remainingWorries 값을 감소
        await worryRepository.decreaseRemainingWorries(userId);

        // 답변자의 remainingAnswers 값을 감소 (중요)
        await worryRepository.decreaseRemainingAnswers(randomAuthorId);

        // 수정된 사용자 정보를 다시 가져와서 현재 남은 고민 횟수를 확인
        const updatedUser = await worryRepository.getUserById(userId);

        // 반환 값에 commentAuthorId와 remainingWorries 포함
        return { ...worry, commentAuthorId: randomAuthorId, remainingWorries: updatedUser.remainingWorries };
    } catch (error) {
        throw new Error(error.message);
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

// 재고민 & 재답변 등록
export const createReply = async (worryId, commentId, content, userId, type, fontColor) => {
    // 댓글(답변) 또는 고민을 가져옵니다.
    const commentOrWorry = await prisma.comments.findUnique({
        where: { commentId: parseInt(commentId) },
        include: {
            worry: true, // 연관된 고민 정보 포함
        },
    });

    if (!commentOrWorry) throw new Error('해당하는 답변 또는 고민이 존재하지 않습니다.');

    // 재고민 생성 시 권한 검증
    if (type === 'reWorry' && commentOrWorry.worry.userId !== userId) {
        throw new Error('답장을 작성할 권한이 없습니다.');
    }

    // 재답변 생성 시 권한 검증
    // 여기서는 연관된 고민의 최초 답변자 ID와 현재 userId를 비교합니다.
    if (type === 'reAnswer' && commentOrWorry.worry.commentAuthorId !== userId) {
        throw new Error('답장을 작성할 권한이 없습니다.');
    }

    const reply = await prisma.comments.create({
        data: {
            worryId: parseInt(worryId),
            fontColor,
            content,
            userId: parseInt(userId),
            parentId: parseInt(commentId),
        },
    });

    return reply;
};
// // 재고민 등록
// export const createReWorry = async (worryId, commentId, content, userId) => {
//     const originalWorry = await worryRepository.getWorryDetail(worryId);
//     if (!originalWorry) throw new Error('해당 고민이 존재하지 않습니다.');
//     if (originalWorry.userId !== userId) throw new Error('재고민을 작성할 권한이 없습니다.');

//     const originalComment = await CommentRepository.findCommentById(commentId);
//     if (!originalComment || originalComment.worryId !== worryId) {
//         throw new Error('적절하지 않은 요청입니다.');
//     }

//     const reWorry = await worryRepository.createComment({
//         worryId,
//         content,
//         userId,
//         parentId: commentId, // 이전 답변(댓글)의 ID
//     });

//     return reWorry;
// };

// //  재답변 생성
// export const createReAnswer = async (worryId, commentId, content, userId) => {
//     // 최초의 답변(또는 재고민)의 작성자 ID 조회
//     const originalComment = await CommentRepository.findCommentById(commentId);
//     if (!originalComment) {
//         throw new Error('해당하는 고민 또는 답변이 존재하지 않습니다.');
//     }

//     // 최초의 고민을 조회하여, 고민의 작성자가 요청자와 일치하는지 확인
//     const originalWorry = await worryRepository.getWorryDetail(worryId);
//     if (!originalWorry) {
//         throw new Error('해당 고민이 존재하지 않습니다.');
//     }

//     // 요청으로 들어온 userId가 최초의 답변자 ID와 일치하는지 확인
//     if (originalComment.userId !== userId) {
//         throw new Error('재답변을 작성할 권한이 없습니다.');
//     }

//     // 재답변 생성
//     const reAnswer = await worryRepository.createComment({
//         worryId,
//         content,
//         userId,
//         parentId: commentId,
//     });

//     return reAnswer;
