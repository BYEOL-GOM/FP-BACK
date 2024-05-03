import Joi from 'joi';

export const replyParamsSchema = Joi.object({
    worryId: Joi.number().integer().required(),
    commentId: Joi.number().integer().optional(),
});

export const replyBodySchema = Joi.object({
    content: Joi.string().min(1).required(),
    fontColor: Joi.string().required(),
    // userId: Joi.number(), // * 로컬에서 답장보내기 테스트 할때(=userId 바디로 넣을때) 이부분 살려서 하지 않으면 '데이터 형식 불일치 오류'가 납니다 :)
});

export const commentDetailSchema = Joi.object({
    commentId: Joi.number().required(),
});
