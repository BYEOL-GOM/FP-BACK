import * as CommentRepository from './comment.repository.js';

// 답변 생성
export const createComment = async (worryId, content, userId) => {
    console.log('💛💛💛서비스 : ', worryId, content, userId);

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
    console.log('💚💚💚서비스 : ', worry.commentAuthorId);

    return await CommentRepository.createComment(commentData);
};

// 대댓글 생성
export const createReply = async (worryId, parentId, content, userId) => {
    return CommentRepository.createCommentReply({ worryId, parentId, content, userId });
};

// 댓글 조회

// 댓글 수정

// 댓글 삭제
