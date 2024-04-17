import * as worryRepository from './worry.repository.js';

// # 고민 등록
export const createWorry = async (content, icon, userId, fontColor) => {
    // 사용자 정보와 남은 고민 횟수를 확인
    const user = await worryRepository.getUserById(userId);
    if (!user || user.remainingWorries <= 0) {
        const error = new Error('최대 고민 작성수를 초과하였습니다');
        error.status = 400;
        throw error;
    }

    // 답변자 Id 랜덤 지정 & 답변 가능 여부 확인
    const randomAuthorId = await worryRepository.getRandomUser(userId);

    // 금지어 포함 여부 확인
    const isBannedWordIncluded = global.bannedWords.some((word) => content.includes(word));

    if (isBannedWordIncluded) {
        const error = new Error('금지어가 포함된 내용은 등록할 수 없습니다');
        error.status = 400;
        throw error;
    }

    // 고민 생성
    const worry = await worryRepository.createWorry(content, icon, userId, randomAuthorId, fontColor);

    // 사용자의 remainingWorries -1 하기
    await worryRepository.decreaseRemainingWorries(userId);

    // 답변자의 remainingAnswers -1 하기
    await worryRepository.decreaseRemainingAnswers(randomAuthorId);

    // 수정된 사용자 정보로  현재 남은 고민 횟수 확인
    const updatedUser = await worryRepository.getUserById(userId);

    return {
        worryId: worry.worryId,
        userId: worry.userId,
        commentAuthorId: randomAuthorId,
        createdAt: worry.createdAt,
        fontColor: worry.fontColor,
        remainingWorries: updatedUser.remainingWorries,
    };
};

// # 고민 상세조회
export const getWorryDetail = async (worryId, userId) => {
    let worry = await worryRepository.getWorryDetail(worryId);
    if (!worry) {
        const error = new Error('해당하는 고민이 존재하지 않습니다');
        error.status = 404;
        throw error;
    }
    if (worry.commentAuthorId !== userId) {
        const error = new Error('고민을 조회할 권한이 없습니다');
        error.status = 403;
        throw error;
    }
    // 고민을 "읽음" 상태로 업데이트
    if (worry.unRead) {
        await worryRepository.updateWorryStatus(worryId);
        worry = await worryRepository.getWorryDetail(worryId);
    }
    return worry;
};

// # 답장이 없는 오래된 메세지 삭제하기
export const deleteOldMessages = async () => {
    const oldWorries = await worryRepository.findOldMessages();

    for (const worry of oldWorries) {
        if (!worry.deletedAt) {
            await worryRepository.deleteSelectedWorry(worry.worryId); // 고민 삭제
            await worryRepository.deleteAllCommentsForWorry(worry.worryId); // 고민의 모든 댓글 삭제
            await worryRepository.updateUserCounts(worry.userId, worry.commentAuthorId); // 사용자 카운터 업데이트
        }
    }
    return oldWorries.length; // 삭제된 고민의 수
};

// # 곤란한 메세지 삭제
export const deleteSelectedWorry = async (worryId, userId, commentId) => {
    const selectedWorry = await worryRepository.getWorry(worryId);
    if (!selectedWorry) {
        const error = new Error('해당하는 메세지가 존재하지 않습니다');
        error.status = 404;
        throw error;
    }

    if (selectedWorry.deletedAt !== null) {
        const error = new Error('해당 메세지는 이미 삭제되었습니다');
        error.status = 409;
        throw error;
    }

    // 0 ) 고민의 작성자도, 지정된 답변자도 아닌 경우, 작성 권한 없음
    if (selectedWorry.userId !== userId && selectedWorry.commentAuthorId !== userId) {
        const error = new Error('메세지를 삭제할수 있는 권한이 없습니다');
        error.status = 403;
        throw error;
    }

    // worryId 소프트 삭제
    await worryRepository.deleteSelectedWorry(worryId);
    // 첫고민이 아닐경우 ,worryId 와 그에 해당하는 모든 commentId 소프트 삭제
    if (commentId) {
        await worryRepository.deleteAllCommentsForWorry(worryId);
    }
    // 사용자 카운트 업데이트
    await worryRepository.updateUserCounts(selectedWorry.userId, selectedWorry.commentAuthorId);

    return;
};

// # 불쾌한 메세지 신고하기
export const reportMessage = async (worryId, userId, commentId, reportReason) => {
    const selectedWorry = await worryRepository.getWorry(worryId);
    if (!selectedWorry) {
        const error = new Error('해당하는 메세지가 존재하지 않습니다');
        error.status = 404;
        throw error;
    }

    // 고민이 이미 삭제되었거나 신고되었는지 확인
    if (selectedWorry.deletedAt !== null) {
        const error = new Error('해당 메세지는 이미 신고되었습니다');
        error.status = 409;
        throw error;
    }

    // 0 ) 고민의 작성자도, 지정된 답변자도 아닌 경우, 신고 권한 없음
    if (selectedWorry.userId !== userId && selectedWorry.commentAuthorId !== userId) {
        const error = new Error('메세지를 신고할수 있는 권한이 없습니다');
        error.status = 403;
        throw error;
    }

    if (commentId) {
        const selectedComment = await worryRepository.getComment(commentId);
        if (!selectedComment) {
            const error = new Error('해당하는 메세지가 존재하지 않습니다');
            error.status = 404;
            throw error;
        }
        // 답장 신고: 답장을 작성한 사용자 ID를 사용
        await worryRepository.reportComment(commentId, selectedComment.userId, reportReason);
    } else {
        // 고민 신고: 고민을 작성한 사용자 ID를 사용
        await worryRepository.reportWorry(worryId, selectedWorry.userId, reportReason);
    }

    await worryRepository.deleteSelectedWorry(worryId);
    if (commentId) {
        await worryRepository.deleteAllCommentsForWorry(worryId);
    }
    await worryRepository.updateUserCounts(selectedWorry.userId, selectedWorry.commentAuthorId);
};

// # 로켓(고민등록 가능) 개수 확인
export const findRemainingWorriesByUserId = async (userId) => {
    const remainingWorries = await worryRepository.findRemainingWorriesByUserId(userId);
    return remainingWorries;
};
