import * as CommentRepository from './comment.repository.js';

// 답변 생성

export const createComment = async (worryId, content, userId) => {
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

    const commentData = {
        worryId: parseInt(worryId),
        userId,
        content,
        authorId: worry.commentAuthorId,
    };

    return await CommentRepository.createComment(commentData);
};

export const findWorryById = async (worryId) => {
    // 이 함수가 정의된 곳
    return await CommentRepository.findWorryById(worryId);
};

// 대댓글 생성
export const createReply = async (worryId, parentId, content, userId) => {
    return CommentRepository.createCommentReply({ worryId, parentId, content, userId });
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

// 답변에 대한 재고민 등록
export const createReworry = async (commentId, content, userId) => {
    try {
        const commentAuthorId = await CommentRepository.findCommentAuthorById(commentId);
        return await CommentRepository.createReworry(commentId, content, userId, commentAuthorId);
    } catch (error) {
        throw new Error('Failed to create reWorry: ' + error.message);
    }
};

// 재고민에 대한 재답변 등록
export const createRecomment = async (reworryId, content, userId) => {
    try {
        return await CommentRepository.createRecomment(reworryId, content, userId);
    } catch (error) {
        throw new Error('Failed to create reReply: ' + error.message);
    }
};
