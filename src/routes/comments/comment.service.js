import * as CommentRepository from './comment.repository.js';

// 답변 생성
export const createComment = async (worryId, content, userId) => {
    console.log('💛💛💛컨트롤러 : ', worryId, content, userId);

    // worryId를 사용하여 고민의 authorId 찾기
    const worry = await CommentRepository.findWorryById(worryId);

    if (!worry) {
        const err = new Error('해당하는 고민 게시글이 존재하지 않습니다.');
        err.status = 404;
        throw err;
    }
    // (성희) 답변 생성할때 worry테이블에 답변시간 등록하기
    await WorriesService.updateLastReplyTime(worryId);

    // 찾아낸 commentAuthorId를 사용하여 댓글 생성
    const commentData = {
        worryId: parseInt(worryId),
        content,
        commentAuthorId: worry.commentAuthorId, // 고민 등록 시 랜덤으로 선택된 사용자 ID 사용
    };
    console.log('💚💚💚컨트롤러 : ', worry.commentAuthorId);

    return await CommentRepository.createComment(commentData);
};

// 대댓글 생성
export const createReply = async (worryId, parentId, content, userId) => {
    return CommentRepository.createCommentReply({ worryId, parentId, content, userId });
};

// 댓글 조회

// 댓글 수정

// 댓글 삭제
