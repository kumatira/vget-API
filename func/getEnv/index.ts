import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { isRunOnLocal } from '../../lib/util';

interface LambdaResponse {
    statusCode: number;
    headers: any;
    body: string;
}

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const environment = process.env.RUN_ENV;
    const message = `hello from ${environment}`;
    const response: LambdaResponse = {
        statusCode: 200,
        headers: event.headers,
        body: JSON.stringify({
            message: message,
        }),
    };
    return response;
};

module.exports = { lambdaHandler };

if (isRunOnLocal()) {
    const event = {
        queryStringParameters: {
            hoge: 'piyo',
        },
    } as unknown as APIGatewayProxyEvent;
    lambdaHandler(event);
}
