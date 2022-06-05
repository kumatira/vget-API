import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Video, Tag } from '../../lib/youtube';
import { isRunOnLocal } from '../../lib/util';

type ErrorHandler = {
    code: string;
    area?: string;
};

type tagRequestObj = {
    videoId: string;
    tag: string;
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
    if (requestBody.tags.some((tag: tagRequestObj) => !tag.tag.includes(':'))) {
        const invalidTags = requestBody.tags
            .filter((tag: tagRequestObj) => !tag.tag.includes(':'))
            .map((t: tagRequestObj) => t.tag)
            .join(',');
        return {
            code: 'ProvidedTagsAreInvalid',
            area: invalidTags,
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
        case 'ProvidedTagsAreInvalid':
            response = {
                statusCode: 404,
                body: JSON.stringify({
                    code: errorHandler.code,
                    message: `Provided tags: [${errorHandler.area}] are invalid.`,
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

const postVideoTags = async (requestParams: { tags: tagRequestObj[] }): Promise<APIGatewayProxyResult> => {
    const isExistList = await Promise.all(requestParams.tags.map((t) => Video.isExistVideoId(t.videoId)));
    const notFoundRequest = requestParams.tags.filter((t, i: number) => !isExistList[i]);
    const notFoundRequestIds = notFoundRequest.map((t) => t.videoId);
    if (notFoundRequestIds.length > 0) {
        return makeErrorResponse({
            code: 'ProvidedVideoIdIsNotFound',
            area: notFoundRequestIds.join(','),
        });
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
                        videoId: 'YT_V_IYN-yKxsbqM',
                        tag: 'startTime:171',
                    },
                    {
                        videoId: 'YT_V_2mDGmBCXTOY',
                        tag: 'startTime:171',
                    },
                ],
            }),
        } as unknown as APIGatewayProxyEvent;
        await lambdaHandler(event);
    })();
}
