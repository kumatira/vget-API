import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {InfrastructureDynamoDB} from '../../lib/aws-infra'
import { isRunOnLocal } from '../../lib/util';

interface LambdaResponse {
    statusCode: number;
    headers: any;
    body: string;
}

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const environment = process.env.RUN_ENV;
    const requestParams = event.queryStringParameters;
    const message = `hello from ${environment}`;
    if (requestParams !== null && requestParams.videoId) {
        console.log(requestParams.videoId);
        console.log(await InfrastructureDynamoDB.checkVideoIdIsExistAtDDB(requestParams.videoId));
    }

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
            videoId: 'FXCn3sf9LZU',
        },
    } as unknown as APIGatewayProxyEvent;
    lambdaHandler(event);
}
