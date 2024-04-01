import * as CommentRepository from './comment.repository.js';
// 답변 생성

export const createComment = async (worryId, content, userId, fontColor) => {
    const worry = await findWorryById(worryId);

    if (!worry) {
        const err = new Error('해당하는 고민 게시글이 존재하지 않습니다.');
        err.status = 404;
        throw err;
    }

    // 해당 댓글이 참조하는 고민의 작성자와 요청한 사용자의 ID 비교
    if (worry.commentAuthorId !== userId) {
        throw new Error('답변 작성 권한이 없습니다');
    }

    // 답변을 이미 작성했으면 오류 메세지
    const existingComment = await CommentRepository.findCommentByWorryId(worryId);
    if (existingComment) {
        throw new Error('이미 답변을 작성했습니다');
    }

    const commentData = {
        worryId: parseInt(worryId),
        userId,
        content,
        authorId: worry.commentAuthorId,
        fontColor,
    };

    return await CommentRepository.createComment(commentData);
};

export const findWorryById = async (worryId) => {
    return await CommentRepository.findWorryById(worryId);
};

//  답변 메세지 전체 조회 (고민작성자에게 도착할 댓글 목록)
export const getCommentsByUserId = async (userId) => {
    try {
        return await CommentRepository.getCommentsByUserId(userId);
    } catch (error) {
        throw new Error('Failed to fetch comments: ' + error.message);
    }
};

// 답변 메세지 상세 조회
export const getCommentDetail = async (commentId) => {
    try {
        return await CommentRepository.getCommentDetail(commentId);
    } catch (error) {
        throw new Error('Failed to fetch comments: ' + error.message);
    }
};
