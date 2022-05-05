import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Video, TagSource, Tag } from '../../lib/youtube';
import { isRunOnLocal } from '../../lib/util';

type ErrorHandler = {
    code: string;
    area?: string;
};

const validateReqParams = (requestBody: any): ErrorHandler | undefined => {
    if (requestBody === null || requestBody === undefined) {
        return {
            code: 'RequiredBodyIsNotProvidedAtAll',
        };
    }
    if (requestBody.tags === undefined || requestBody.tags === '' || requestBody.tags.length === 0) {
        return {
            code: 'RequiredBodyParamIsNotProvided',
            area: 'tags',
        };
    }
    return undefined;
};

const makeErrorResponse = (errorHandler: ErrorHandler): APIGatewayProxyResult => {
    let response: APIGatewayProxyResult;
    switch (errorHandler.code) {
        case 'RequiredBodyIsNotProvidedAtAll':
            response = {
                statusCode: 400,
                body: JSON.stringify({
                    code: errorHandler.code,
                    message: 'This is POST function. Body is required.',
                }),
            };
            break;
        case 'RequiredBodyParamIsNotProvided':
            response = {
                statusCode: 400,
                body: JSON.stringify({
                    code: errorHandler.code,
                    message: `Required parameter in body: ${errorHandler.area} is not provided.`,
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

const postVideoTags = async (requestParams: { tags: TagSource[] }): Promise<APIGatewayProxyResult> => {
    const isExistList = await Promise.all(requestParams.tags.map((t: TagSource) => Video.isExistVideoId(t.videoId)));
    const notFoundRequest = requestParams.tags.filter((t: TagSource, i: number) => !isExistList[i]);
    const notFoundRequestIds = notFoundRequest.map((t: TagSource) => t.videoId);
    if (notFoundRequestIds.length > 0) {
        return makeErrorResponse({ code: 'ProvidedVideoIdIsNotFound', area: notFoundRequestIds.join(',') });
    }

    const requestedTags = requestParams.tags.map((t) => new Tag(t));
    await Promise.all(requestedTags.map((t: Tag) => t.put()));

    // ToDo: 成功した後のVideoを返すようにする
    const okResponse: APIGatewayProxyResult = {
        statusCode: 200,
        body: JSON.stringify({
            ResultSet: {
                apiVersion: '0.0.1',
                Video: 'ok',
            },
        }),
    };
    return okResponse;
};

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const requestBody = event.body === null ? null : JSON.parse(event.body);
    console.log(`requestBody: ${JSON.stringify(requestBody, null, 2)}`);
    const errorHandler = validateReqParams(requestBody);

    const response = errorHandler === undefined ? await postVideoTags(requestBody) : makeErrorResponse(errorHandler);
    console.log(`statusCode: ${response.statusCode}`);
    console.log(`responseBody: ${JSON.stringify(JSON.parse(response.body), null, 2)}`);
    return response;
};

module.exports = { lambdaHandler };

if (isRunOnLocal()) {
    (async () => {
        const event = {
            body: JSON.stringify({
                tags: [
                    {
                        videoId: 'IYN-yKxsbqM',
                        key: 'startTIme',
                        value: '171',
                    },
                    {
                        videoId: '2mDGmBCXTOY',
                        key: 'startTIme',
                        value: '171',
                    },
                ],
            }),
        } as unknown as APIGatewayProxyEvent;
        const res = await lambdaHandler(event);
    })();
}
