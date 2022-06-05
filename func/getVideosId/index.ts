import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Video } from '../../lib/youtube';
import { isRunOnLocal } from '../../lib/util';

type ErrorHandler = {
    code: string;
    area?: string;
};

const validateReqParams = (pathParameters: any): ErrorHandler | undefined => {
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

const getVideos = async (pathParameters: any): Promise<APIGatewayProxyResult> => {
    const video = await Video.init(pathParameters.videoId);

    if (video === undefined) {
        const errorHandler = {
            code: 'ProvidedVideoIdIsNotFound',
            area: pathParameters.videoId,
        };
        return makeErrorResponse(errorHandler);
    }

    const responseVideoObj = video.makeVideoResponse();

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
    console.log(`requestPathParams: ${JSON.stringify(requestPathParams, null, 2)}`);
    const errorHandler = validateReqParams(requestPathParams);

    const response = errorHandler === undefined ? await getVideos(requestPathParams) : makeErrorResponse(errorHandler);

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
                videoId: 'YT_V_2jNlCjCY4ts',
            },
        } as unknown as APIGatewayProxyEvent;
        await lambdaHandler(event);
    })();
}
