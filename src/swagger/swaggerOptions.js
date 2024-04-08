import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: '손흥민 ,봉준호 ,페이커 ,비티에스',
        version: '1.0.0',
        description: '제발되게 해주세요',
    },
};

const options = {
    swaggerDefinition,
    apis: ['./routes/user/user.router.js'],
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };
