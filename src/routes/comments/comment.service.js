import * as CommentRepository from './comment.repository.js';

//  # 답변 메세지 전체 조회
export const findLatestCommentsAndWorriesForUser = async (userId) => {
    try {
        return await CommentRepository.findLatestCommentsAndWorriesForUser(userId);
    } catch (error) {
        throw new Error('데이터를 조회하는 도중 오류가 발생했습니다.');
    }
};

// # 답장 상세조회
export const getCommentDetail = async (commentId) => {
    return await CommentRepository.getCommentDetails(commentId);
};

// # 답장보내기
export const createReply = async (worryId, commentId, content, userId, fontColor) => {
    // 금지어 포함 여부 확인
    const isBannedWordIncluded = global.bannedWords.some((word) => content.includes(word));
    if (isBannedWordIncluded) {
        throw new Error('금지어가 포함된 내용은 등록할 수 없습니다.');
    }

    let parentId = commentId ? parseInt(commentId) : null;

    // 중복 답변 검증
    const existingReply = await CommentRepository.checkForExistingReply(worryId, userId, parentId);
    if (existingReply) {
        throw new Error('이미 답변을 작성했습니다.');
    }

    // 최초 답변 권한 검증
    if (!parentId) {
        const worry = await CommentRepository.findWorryById(worryId);
        if (worry.commentAuthorId !== userId) {
            throw new Error('답변 작성 권한이 없습니다.');
        }
    } else {
        // 이후 답변(재답변) 권한 검증
        const lastReply = await CommentRepository.findLastReplyByWorryId(worryId, parentId);
        if (!lastReply || lastReply.userId === userId) {
            throw new Error('답변 작성 권한이 없습니다.');
        }
    }

    // 댓글(답변) 생성
    const comment = await CommentRepository.createReply({
        worryId,
        content,
        userId,
        parentId,
        fontColor,
    });

    // 클라이언트에 반환할 때는 필요한 정보만 포함시키도록 구성
    return {
        commentId: comment.commentId,
        content: comment.content,
        createdAt: comment.createdAt,
        fontColor: comment.fontColor,
        parentId: comment.parentId,
        // userId: comment.userId,
        worryId: comment.worryId,
    };
};

// # 답장 삭제 또는 신고하기
export const deleteComment = async ({ commentId, userId, deleteReason }) => {
    const comment = await CommentRepository.getComment(commentId);
    if (!comment) {
        throw new Error('해당하는 답변이 존재하지 않습니다');
    }
    if (comment.deletedAt !== null) {
        throw new Error('해당 답장은 이미 삭제되었습니다');
    }

    // 본인이 작성한 답변 삭제 금지
    if (comment.userId === userId) {
        throw new Error('답장을 삭제할 권한이 없습니다.');
    }

    // 고민의 작성자 또는 답변(대댓글)의 부모 답변의 작성자인지 확인
    const isWorryAuthor = comment.worry.userId === userId;
    const isParentCommentAuthor = comment.parent && comment.parent.userId === userId;
    if (!isWorryAuthor && !isParentCommentAuthor) {
        throw new Error('답장을 삭제할 권한이 없습니다.');
    }

    await CommentRepository.deleteComment(commentId);

    // 삭제 이유가 DIFFICULT_TO_ANSWER 일 경우,
    if (deleteReason === 'DIFFICULT_TO_ANSWER') {
        // 답변 작성자 및 부모의 카운트 업데이트
        await CommentRepository.updateUserCounts(commentId, deleteReason, userId);
    }
    // 삭제 이유가 OFFENSIVE_CONTENT 일 경우,
    else if (deleteReason === 'OFFENSIVE_CONTENT') {
        // 답변자의 remainingAnswers만 업데이트, 신고 기록
        await CommentRepository.updateUserCounts(commentId, deleteReason, userId);
    }
};
