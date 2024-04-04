import * as worryRepository from './worry.repository.js';

//고민 등록
export const createWorry = async ({ content, icon, userId, fontColor }) => {
    try {
        // 사용자 정보와 남은 고민 횟수를 확인
        const user = await worryRepository.getUserById(userId);
        if (!user || user.remainingWorries <= 0) {
            throw new Error('최대 고민 작성수를 초과하였습니다');
        }

        // 답변자 Id 랜덤 지정 & 답변 가능 여부 확인
        const randomAuthorId = await worryRepository.getRandomUser(userId);

        // 금지어 포함 여부 확인
        const isBannedWordIncluded = global.bannedWords.some((word) => content.includes(word));

        if (isBannedWordIncluded) {
            throw new Error('금지어가 포함된 내용은 등록할 수 없습니다.');
        }

        // 고민 생성
        const worry = await worryRepository.createWorry({ content, icon, userId, randomAuthorId, fontColor });

        // 사용자의 remainingWorries -1 하기
        await worryRepository.decreaseRemainingWorries(userId);

        // 답변자의 remainingAnswers -1 하기
        await worryRepository.decreaseRemainingAnswers(randomAuthorId);

        // 수정된 사용자 정보로  현재 남은 고민 횟수 확인
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

// 곤란한 질문 삭제 및 신고하기
export const deleteSelectedWorry = async (worryId, userId, deleteReason) => {
    const selectedWorry = await worryRepository.getWorry(worryId);
    if (!selectedWorry) {
        throw new Error('해당하는 고민이 존재하지 않습니다');
    }

    if (selectedWorry.commentAuthorId !== userId) {
        throw new Error('답변 대상자만 곤란한 고민을 삭제할 수 있습니다');
    }

    if (selectedWorry.deletedAt !== null) {
        throw new Error('해당 고민은 이미 삭제되었습니다');
    }

    const deletedWorry = await worryRepository.deleteSelectedWorry(worryId, deleteReason);

    return deletedWorry;
};
// export const deleteSelectedWorry = async (worryId, userId, deleteReason) => {
//     const worry = await worryRepository.getWorry(worryId);
//     if (!worry) {
//         throw new Error('해당하는 고민이 존재하지 않습니다');
//     }

//     // 이미 삭제된 고민인지 확인
//     if (worry.deletedAt !== null) {
//         throw new Error('해당 고민은 이미 삭제되었습니다');
//     }

//     // 답변 대상자 확인
//     if (worry.commentAuthorId !== userId) {
//         throw new Error('답변 대상자만 곤란한 고민을 삭제할 수 있습니다');
//     }

//     // 삭제 처리
//     await worryRepository.deleteWorry(worryId);
//     const worryAuthorId = worry.userId;
//     const commentAuthorId = worry.commentAuthorId;
//     if (deleteReason === 'DIFFICULT_TO_ANSWER') {
//         // 삭제 이유가 답변하기 어려운 경우
//         await worryRepository.updateUserCounts(+worryAuthorId, +commentAuthorId);
//     } else if (deleteReason === 'OFFENSIVE_CONTENT') {
//         // 삭제 이유가 불쾌한 내용인 경우
//         await worryRepository.updateUserWorryCount(+worryAuthorId);
//         // 신고 로직 추가 예정
//     }
// };
