import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Video } from '../../lib/youtube';
import { isRunOnLocal } from '../../lib/util';

type ErrorHandler = {
    code: string;
    area?: string;
};

const validateReqParams = (requestParams: any): ErrorHandler | undefined => {
    if (requestParams === null || requestParams === undefined) {
        return {
            code: 'RequiredParamIsNotProvidedAtAll',
        };
    }
    if (requestParams.videoId === undefined || requestParams.videoId === '') {
        return {
            code: 'RequiredParamIsNotProvided',
            area: 'videoId',
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
        case 'RequiredParamIsNotProvided':
            response = {
                statusCode: 400,
                body: JSON.stringify({
                    code: errorHandler.code,
                    message: `Required Parameter: ${errorHandler.area} is not provided.`,
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

const getVideos = async (requestParams: any): Promise<APIGatewayProxyResult> => {
    const video = await Video.init(requestParams.videoId);

    if (video === undefined) {
        const errorHandler = {
            code: 'ProvidedVideoIdIsNotFound',
            area: requestParams.videoId,
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

    const okResponse: APIGatewayProxyResult = {
        statusCode: 200,
        body: JSON.stringify({
            ResultSet: {
                apiVersion: '0.0.1',
                Video: responseVideoObj,
            },
        }),
    };
    return okResponse;
};

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const requestParams = event.queryStringParameters;
    const errorHandler = validateReqParams(requestParams);

    const response = errorHandler === undefined ? getVideos(requestParams) : makeErrorResponse(errorHandler);
    console.log(`statusCode: ${response.statusCode}`);
    console.log(`responseBody: ${JSON.stringify(JSON.parse(response.body), null, 2)}`);
    return response;
};

module.exports = { lambdaHandler };

if (isRunOnLocal()) {
    console.log('=============================');
    (async () => {
        const event = {
            queryStringParameters: {
                videoId: 'FXCn3sf9LZU',
            },
        } as unknown as APIGatewayProxyEvent;
        const res = await lambdaHandler(event);
    })();
}
