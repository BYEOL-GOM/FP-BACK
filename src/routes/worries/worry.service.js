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

// // 재고민 & 재답변 등록
// export const createReply = async (worryId, commentId, content, userId, type, fontColor) => {
//     // 댓글(답변) 또는 고민을 가져옵니다.
//     const parentComment = await prisma.comments.findUnique({
//         where: { commentId: parseInt(commentId) },
//         include: {
//             worry: true, // 연관된 고민 정보 포함
//         },
//     });
//     if (!parentComment) throw new Error('해당하는 답변 또는 고민이 존재하지 않습니다.');

//     const parentId = parseInt(commentId);

//     // 재고민 또는 재답변이 이미 존재하는지 확인
//     const existingReply = await prisma.comments.findFirst({
//         where: {
//             parentId: parseInt(commentId),
//             userId: parseInt(userId),
//         },
//     });

//     if (existingReply) {
//         throw new Error('이미 답장을 보냈습니다.');
//     }

//     // 재고민 생성 시 권한 검증
//     if (type === 'reWorry' && parentComment.worry.userId !== userId) {
//         throw new Error('답장을 작성할 권한이 없습니다.');
//     }

//     // 재답변 생성 시 권한 검증
//     //연관된 고민의 최초 답변자 ID와 현재 userId를 비교
//     if (type === 'reAnswer' && parentComment.worry.commentAuthorId !== userId) {
//         throw new Error('답장을 작성할 권한이 없습니다.');
//     }

//     const reply = await worryRepository.createComment({
//         worryId: parseInt(worryId),
//         content,
//         userId: parseInt(userId),
//         parentId, // 부모 댓글 ID 사용
//         fontColor,
//     });

//     return reply;
// };
