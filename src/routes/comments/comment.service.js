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
export const getCommentDetail = async (commentId, userId) => {
    try {
        const comment = await CommentRepository.getComment(commentId);
        if (!comment) {
            throw new Error('해당하는 답장이 존재하지 않습니다');
        }
        // 첫 번째 답변인 경우
        if (comment.parentId === null) {
            if (comment.worry.userId !== userId) {
                throw new Error('답장을 조회할 권한이 없습니다.');
            }
        } else {
            // 대댓글인 경우
            const parentComment = await CommentRepository.getComment(comment.parentId);
            if (!parentComment || parentComment.userId !== userId) {
                throw new Error('답장을 조회할 권한이 없습니다.');
            }
        }
        return {
            commentId: comment.commentId,
            content: comment.content,
            createdAt: comment.createdAt,
            fontColor: comment.fontColor,
            parentId: comment.parentId,
            worryId: comment.worryId,
        };
    } catch (error) {
        throw new Error(error.message);
    }
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

// # 답변하기 어려운 답장 삭제하기
export const deleteComment = async (commentId, userId) => {
    const comment = await CommentRepository.getComment(commentId);
    if (!comment) {
        throw new Error('해당하는 답변이 존재하지 않습니다');
    }
    if (comment.deletedAt !== null) {
        throw new Error('해당 답장은 이미 삭제되었습니다');
    }
    // 첫 번째 답변인 경우
    if (comment.parentId === null) {
        if (comment.worry.userId !== userId) {
            throw new Error('답장을 삭제할 권한이 없습니다.');
        }
    } else {
        // 대댓글인 경우
        const parentComment = await CommentRepository.getComment(comment.parentId);
        if (!parentComment || parentComment.userId !== userId) {
            throw new Error('답장을 삭제할 권한이 없습니다.');
        }
    }

    await CommentRepository.deleteComment(commentId);

    await CommentRepository.updateUserCounts(commentId, userId);
};

// # 답장 신고하기
export const reportComment = async (commentId, userId, reportReason) => {
    const comment = await CommentRepository.getComment(commentId);
    if (!comment) {
        throw new Error('해당하는 답장이 존재하지 않습니다');
    }
    if (comment.deletedAt !== null) {
        throw new Error('해당 답장은 이미 신고되었습니다');
    }
    // 첫 번째 답변인 경우
    if (comment.parentId === null) {
        if (comment.worry.userId !== userId) {
            throw new Error('답장을 신고할 권한이 없습니다.');
        }
    } else {
        // 대댓글인 경우
        const parentComment = await CommentRepository.getComment(comment.parentId);
        if (!parentComment || parentComment.userId !== userId) {
            throw new Error('답장을 신고할 권한이 없습니다.');
        }
    }

    await CommentRepository.deleteComment(commentId);

    await CommentRepository.updateUserCounts(commentId, userId);
    // 답장 신고 로직
    await CommentRepository.reportComment(commentId, userId, reportReason);
};
