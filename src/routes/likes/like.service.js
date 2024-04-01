import * as LikeRepository from './like.repository.js';

// 해당 고민 게시글 가져오기
export const getWorryById = async (worryId) => {
    const worry = await LikeRepository.findWorryById(worryId);
    if (!worry) {
        const err = new Error('해당하는 답변의 고민 게시글이 존재하지 않습니다.');
        err.status = 404;
        throw err;
    }
    return worry;
};

// 선물 보내기
export const sendLike = async (worryId, commentId, userId) => {
    console.log('💛💛💛서비스 : ', worryId, commentId, userId);

    // 해당 고민 게시글 가져오기 및 유효성 검사
    const worry = await LikeRepository.findWorryById(worryId);
    if (!worry) {
        const err = new Error('해당 고민 게시글을 찾을 수 없습니다.');
        err.status = 404;
        throw err;
    }
    const commentAuthorId = worry.commentAuthorId;

    // 선물 보내는 유저가 고민 게시글의 작성자가 아니라면 에러
    if (worry.userId !== userId) {
        const err = new Error('선물을 보낼 권한이 없습니다. 게시글의 작성자만 선물을 보낼 수 있습니다.');
        err.status = 403; // Forbidden access
        throw err;
    }

    // 선물을 이미 보냈다(고민 해결)면 에러 처리
    if (worry.isSolved) {
        const err = new Error('이미 선물이 전송되었습니다.');
        err.status = 400;
        throw err;
    }

    // commentId 유효성 검사
    const comment = await LikeRepository.verifyCommentExists(commentId, worryId);
    if (!comment) {
        const err = new Error('유효하지 않은 댓글입니다.');
        err.status = 400;
        throw err;
    }
    console.log('🥕🥕🥕서비스 worry.commentAuthorId, commentExists.userId', worry.commentAuthorId, comment.userId);
    // commentAuthorId 체크
    if (worry.commentAuthorId !== comment.userId) {
        const err = new Error('선택한 댓글은 이 고민에 대한 지정된 답변자의 것이 아닙니다.');
        err.status = 400;
        throw err;
    }

    // 좋아요(답례) 보내기. (고민(worry)을 해결된 상태로 변경)
    const present = await LikeRepository.markWorryAsSolvedAndCreateLike(worryId, commentId, userId, commentAuthorId);
    console.log('🩵🩵🩵서비스-worryId, commentId, userId : ', worryId, commentId, userId, commentAuthorId);

    return present;
};

// '나의 해결된 고민' 목록 전체 조회
export const getSolvedWorriesByUserId = async (userId, page, limit) => {
    return LikeRepository.findSolvedWorriesByUserId(userId, page, limit);
};

// '내가 해결한 고민' 목록 전체 조회
export const getHelpedSolveWorriesByUserId = async (userId, page, limit) => {
    return LikeRepository.findHelpedSolveWorriesByUserId(userId, page, limit);
};

// '나의 해결된 고민' 상세 조회
export const getSolvedWorryDetailsById = async (worryId) => {
    return LikeRepository.findSolvedWorryDetailsById(worryId);
};

// '내가 해결한 고민' 상세 조회
export const getHelpedSolveWorryDetailsById = async (worryId) => {
    return LikeRepository.findHelpedSolveWorryDetailsById(worryId);
};
