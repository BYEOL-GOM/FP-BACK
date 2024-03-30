import * as CommentRepository from './comment.repository.js';

// 답변 생성
export const createComment = async (worryId, content, userId) => {
    // worryId를 사용하여 고민의 authorId 찾기
    const worry = await CommentRepository.findWorryById(worryId);

    if (!worry) {
        const err = new Error('해당하는 고민 게시글이 존재하지 않습니다.');
        err.status = 404;
        throw err;
    }

    // 찾아낸 authorId를 사용하여 댓글 생성
    const commentData = {
        worryId: parseInt(worryId),
        userId,
        content,
        authorId: worry.commentAuthorId, // 고민 등록 시 랜덤으로 선택된 사용자 ID 사용
    };

    return await CommentRepository.createComment(commentData);
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
        return await CommentRepository.createReworry(commentId, content, userId);
    } catch (error) {
        throw new Error('Failed to create reWorry: ' + error.message);
    }
};
