import * as commentRepository from './comment.repository.js';

//  # 유저에게 온 전체 최신 메세지
export const getAllLatestMessages = async (userId) => {
    try {
        return await commentRepository.getAllLatestMessages(userId);
    } catch (error) {
        throw new Error('데이터를 조회하는 도중 오류가 발생했습니다.');
    }
};

// # 답장 상세조회
export const getCommentDetail = async (commentId, userId) => {
    try {
        const comment = await commentRepository.getComment(commentId);
        if (!comment) {
            throw new Error('해당하는 답장이 존재하지 않습니다');
        }
        // 1 ) 해당 comment 가 첫 번째 답변인 경우,
        if (comment.parentId === null) {
            if (comment.worry.userId !== userId) {
                // 유저가 고민 작성자가 아니라면 조회 권한 없음
                throw new Error('답장을 조회할 권한이 없습니다.');
            }
        } else {
            // 2 ) 대댓글(재고민 or 재답변)인 경우,
            const parentComment = await commentRepository.getComment(comment.parentId); // 부모 댓글
            if (!parentComment || parentComment.userId !== userId) {
                // 유저가 부모 댓글의 작성자가 아닐 경우 조회 권한 없음
                throw new Error('답장을 조회할 권한이 없습니다.');
            }
        }

        // 답장을 '읽음' 상태로 업데이트
        await commentRepository.updateCommentStatus(commentId);

        // 업데이트된 답장 정보 조회
        const updatedComment = await commentRepository.getComment(commentId);

        // 클라이언트에게 반환을 위한 객체 생성
        const response = {
            commentId: updatedComment.commentId,
            content: updatedComment.content,
            createdAt: updatedComment.createdAt,
            fontColor: updatedComment.fontColor,
            unRead: updatedComment.unRead,
            parentId: updatedComment.parentId,
            worryId: updatedComment.worryId,
            worryUserId: updatedComment.worry?.userId, // 고민 작성자 userId
            icon: updatedComment.worry?.icon,
            isSolved: updatedComment.worry.isSolved,
        };

        return response;
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
    // commentId가 있으면 재고민 or 재답변인 경우, 없으면 최초 답변인 경우(=> parentId 에 null 넣기)
    let parentId = commentId ? parseInt(commentId) : null;

    // 작성 권한 검증
    const worry = await commentRepository.findWorryById(worryId);
    // 0 ) 고민의 작성자도, 지정된 답변자도 아닌 경우, 작성 권한 없음
    if (worry.userId !== userId && worry.commentAuthorId !== userId) {
        throw new Error('답변 작성 권한이 없습니다.');
    }
    if (!parentId) {
        // 1 ) 최초 답장을 작성하는 경우,
        const worry = await commentRepository.findWorryById(worryId);
        if (worry.commentAuthorId !== userId) {
            // 유저가 해당 고민의 답변자가 아닐 경우, 작성 권한 없음
            throw new Error('답변 작성 권한이 없습니다.');
        }
    } else {
        // 2 ) 이후 답장(재고민 or 재답장)인 경우,
        const lastReply = await commentRepository.findLastReplyByWorryId(worryId, parentId);
        if (!lastReply || lastReply.userId === userId) {
            throw new Error('답변 작성 권한이 없습니다.');
        }
    }

    // 중복 답변 검증
    const existingReply = await commentRepository.checkForExistingReply(worryId, userId, parentId);
    if (existingReply) {
        throw new Error('이미 답변을 작성했습니다.');
    }

    // 답장 생성
    const comment = await commentRepository.createReply({
        worryId,
        content,
        userId,
        parentId,
        fontColor,
    });

    // 고민 테이블에 updatedAt 업데이트
    await commentRepository.updateWorryUpdatedAt(worryId);

    // 클라이언트에 반환할 정보
    return {
        commentId: comment.commentId,
        content: comment.content,
        createdAt: comment.createdAt,
        unRead: comment.unRead,
        fontColor: comment.fontColor,
        parentId: comment.parentId,
        // userId: comment.userId,
        worryId: comment.worryId,
    };
};

// # 답장 신고하기
export const reportComment = async (commentId, userId, reportReason) => {
    const comment = await commentRepository.getComment(commentId);
    if (!comment) {
        throw new Error('해당하는 답장이 존재하지 않습니다');
    }
    if (comment.deletedAt !== null) {
        throw new Error('해당 답장은 이미 신고되었습니다');
    }
    // 1)  첫번째 답변인 경우
    if (comment.parentId === null) {
        if (comment.worry.userId !== userId) {
            throw new Error('답장을 신고할 권한이 없습니다.');
        }
    } else {
        // 2 ) 재고민 or 재답변인 경우
        const parentComment = await commentRepository.getComment(comment.parentId);
        if (!parentComment || parentComment.userId !== userId) {
            throw new Error('답장을 신고할 권한이 없습니다.');
        }
    }

    // 답장 신고
    await commentRepository.reportComment(commentId, comment.userId, reportReason);
    // 답장 삭제
    await commentRepository.deleteComment(commentId);
    // 연관된 worryId 삭제
    await commentRepository.deleteWorry(comment.worryId);
    // 사용자 카운트 업
    await commentRepository.updateUserCounts(comment, userId);
};
