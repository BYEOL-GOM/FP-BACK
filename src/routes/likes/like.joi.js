import Joi from 'joi';

// 답례 보내기의 params 유효성 검증 스키마 정의
export const paramsSchema = Joi.object({
    worryId: Joi.number().integer().required(),
    commentId: Joi.number().integer().required(),
});

// 답례 보내기의 body 유효성 검증 스키마 정의
export const likeSchema = Joi.object({
    fontcolor: Joi.string().required(),
    // content: Joi.string().allow('', null),
    // content: Joi.string().allow('', null).allow(Joi.number()),
    content: Joi.alternatives().try(Joi.string(), Joi.number()).allow('', null),
    // userId: Joi.number().integer(), // * 로컬에서 테스트 할때(=userId 바디로 넣을때) 이부분 살려서 하지 않으면 '데이터 형식 불일치 오류'가 납니다 :)
});

// 보관함의 상세 조회를 위한 스키마
export const worryIdSchema = Joi.object({
    worryId: Joi.number().integer().min(1).required(), // worryId가 1 이상의 정수여야 함
});
