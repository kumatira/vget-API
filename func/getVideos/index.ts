import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Video } from '../../lib/youtube';
import { InfrastructureDynamoDB } from '../../lib/aws-infra';
import { isRunOnLocal, isBlank } from '../../lib/util';

type ErrorHandler = {
    code: string;
    area?: string;
};

type requestParams = {
    videoId?: string;
    channelId?: string;
}

const validateReqParams = (requestParams: any): ErrorHandler | undefined => {
    if (requestParams === null || requestParams === undefined) {
        return {
            code: 'RequiredParamIsNotProvidedAtAll',
        };
    }
    if (isBlank(requestParams.videoId) && isBlank(requestParams.channelId) ) {
        return {
            code: 'RequiredParamIsNotProvided',
            area: 'videoId or channelId',
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
                    message: `Required Parameter: ${errorHandler.area} are not provided.`,
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

const getVideoByVideoId = async (videoId: string):Promise<Video[]> => {
    const video = await Video.init(videoId);
    if (video === undefined) {
        return [];
    } else {
        return [video]
    }
}

const getVideosByChannelId = async (channelId: string):Promise<Video[]> => {
    const videoIds = (await InfrastructureDynamoDB.getRecordsByDataValue(channelId))?.map(r=>r.id);
    console.log(videoIds);
    if (videoIds === undefined) {
        return [];
    }
    const videos = await Promise.all(videoIds?.map(videoId => Video.init(videoId))) as Video[];
    if (videos === undefined) {
        return [];
    } else {
        return videos
    }
}

const getVideos = async (requestParams: requestParams): Promise<APIGatewayProxyResult> => {
    let videos: Video[] = []
    if (requestParams.videoId !== undefined) {
        videos = await getVideoByVideoId(requestParams.videoId);
    } else if (requestParams.channelId !== undefined){
        videos = await getVideosByChannelId(requestParams.channelId);
    }

    const resultVideos = videos.map(v=>{
        const responseVideoObj: any = {};
        responseVideoObj.id = v.id;
        responseVideoObj.title = v.title;
        responseVideoObj.publishedAt = v.publishedAt;
        responseVideoObj.channelID = v.channelId;
        if (v.scheduledStartTime !== undefined) {
            responseVideoObj.scheduledStartTime = v.scheduledStartTime;
        }
        if (v.actualStartTime !== undefined) {
            responseVideoObj.actualStartTime = v.actualStartTime;
        }
        if (v.actualEndTime !== undefined) {
            responseVideoObj.actualEndTime = v.actualEndTime;
        }
        if (v.tags !== undefined) {
            responseVideoObj.tags = v.tags;
        }
        return responseVideoObj
    })

    const okResponse: APIGatewayProxyResult = {
        statusCode: 200,
        body: JSON.stringify({
            ResultSet: {
                apiVersion: '0.0.1',
                videos: resultVideos,
            },
        })
    };
    return okResponse;
};

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const requestParams = event.queryStringParameters;
    console.log(`requestBody: ${JSON.stringify(requestParams, null, 2)}`);
    const errorHandler = validateReqParams(requestParams);
    const validatedRequestParams = requestParams as requestParams;

    const response = errorHandler === undefined ? await getVideos(validatedRequestParams) : makeErrorResponse(errorHandler);
    response.headers = {
        "Access-Control-Allow-Origin": "*"
    }
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
                videoId: 'YT_V_IYN-yKxsbqM',
            },
        } as unknown as APIGatewayProxyEvent;
        const res = await lambdaHandler(event);
    })();
}
