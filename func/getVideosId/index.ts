import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Video } from '../../lib/youtube';
import { isRunOnLocal } from '../../lib/util';

type ErrorHandler = {
    code: string;
    area?: string;
};

const validateReqParams = (pathParameters: any, queryParameters: any): ErrorHandler | undefined => {
    if (pathParameters === null || pathParameters === undefined) {
        return {
            code: 'RequiredParamIsNotProvidedAtAll',
        };
    }
    return undefined;
};

const makeErrorResponse = (errorHandler: ErrorHandler): APIGatewayProxyResult => {
    let response: APIGatewayProxyResult;
    switch (errorHandler.code) {
        case 'RequiredParamIsNotProvidedAtAll':
            response = {
                statusCode: 400,
                body: JSON.stringify({
                    code: errorHandler.code,
                    message: 'Required Parameter is not provided.',
                }),
            };
            break;
        case 'ProvidedVideoIdIsNotFound':
            response = {
                statusCode: 404,
                body: JSON.stringify({
                    code: errorHandler.code,
                    message: `Provided videoId: ${errorHandler.area} is not found.`,
                }),
            };
            break;
        default:
            response = {
                statusCode: 500,
                body: JSON.stringify({
                    code: 'unhandledError',
                    message: `Something wrong...`,
                }),
            };
    }

    return response;
};

const getVideos = async (pathParameters: any, queryParameters: any): Promise<APIGatewayProxyResult> => {
    const video = await Video.init(pathParameters.videoId);

    if (video === undefined) {
        const errorHandler = {
            code: 'ProvidedVideoIdIsNotFound',
            area: pathParameters.videoId,
        };
        return makeErrorResponse(errorHandler);
    }

    const responseVideoObj: any = {};
    responseVideoObj.id = video.id;
    responseVideoObj.title = video.title;
    responseVideoObj.publishedAt = video.publishedAt;
    responseVideoObj.channelID = video.channelId;
    if (video.scheduledStartTime !== undefined) {
        responseVideoObj.scheduledStartTime = video.scheduledStartTime;
    }
    if (video.actualStartTime !== undefined) {
        responseVideoObj.actualStartTime = video.actualStartTime;
    }
    if (video.actualEndTime !== undefined) {
        responseVideoObj.actualEndTime = video.actualEndTime;
    }
    if (video.tags !== undefined) {
        responseVideoObj.tags = video.tags;
    }

    const okResponse: APIGatewayProxyResult = {
        statusCode: 200,
        body: JSON.stringify({
            ResultSet: {
                apiVersion: '0.0.1',
                video: responseVideoObj,
            },
        }),
    };
    return okResponse;
};

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const requestPathParams = event.pathParameters;
    const requestQueryParams = event.queryStringParameters;
    console.log(`requestPathParams: ${JSON.stringify(requestPathParams, null, 2)}`);
    console.log(`requestQueryParams: ${JSON.stringify(requestQueryParams, null, 2)}`);
    const errorHandler = validateReqParams(requestPathParams, requestQueryParams);

    const response = errorHandler === undefined ? await getVideos(requestPathParams, requestQueryParams) : makeErrorResponse(errorHandler);

    console.log(`statusCode: ${response.statusCode}`);
    console.log(`responseBody: ${JSON.stringify(JSON.parse(response.body), null, 2)}`);
    return response;
};

module.exports = { lambdaHandler };

if (isRunOnLocal()) {
    console.log('=============================');
    (async () => {
        const event = {
            pathParameters: {
                videoId: 'YT_V_ZYuoZuy2KqI',
            },
        } as unknown as APIGatewayProxyEvent;
        const res = await lambdaHandler(event);
    })();
}
