import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Video } from '../../lib/youtube';
import { InfrastructureDynamoDB } from '../../lib/aws-infra';
import { isRunOnLocal, isBlank, isNumeric } from '../../lib/util';

type ErrorHandler = {
    statusCode: number;
    code: string;
    message: string;
};

type requestParams = {
    videoId?: string;
    channelId?: string;
    limit?: number;
}

const validateReqParams = (params: any): ErrorHandler | undefined => {
    if (params === null || params === undefined || Object.keys(params).length === 0) {
        return {
            statusCode: 404,
            code: 'RequiredParamIsNotProvidedAtAll',
            message: 'Required Parameter is not provided.'
        };
    }
    if (isBlank(params.videoId) && isBlank(params.channelId) ) {
        return {
            statusCode: 404,
            code: 'RequiredParamIsNotProvided',
            message: `One of the required parameters [videoId, channelId] must be provided.`,
        };
    }
    if (!isBlank(params.limit) && !isNumeric(params.limit)) {
        return {
            statusCode: 404,
            code: 'ProvidedLimitParamIsNotNumeric',
            message: 'parameter [limit] must be numeric'
        };
    }
    if (!isBlank(params.limit) && Number(params.limit) > 40) {
        return {
            statusCode: 404,
            code: 'ProvidedLimitParamIsNotNumeric',
            message: 'parameter [limit] must be 40 or less'
        };
    }
    return undefined;
};

const fulfillReqParams = (requestParams: any): requestParams => {
    if (!isBlank(requestParams.videoId)) {
        return {
            videoId: requestParams.videoId
        }
    }
    if (!isBlank(requestParams.channelId)) {
        return {
            channelId: requestParams.channelId,
            limit: isBlank(requestParams.limit)? 3 : Number(requestParams.limit)
        }
    }
    return {}
};

const makeErrorResponse = (errorHandler: ErrorHandler): APIGatewayProxyResult => {
    // let response: APIGatewayProxyResult;
    const response: APIGatewayProxyResult = {
        statusCode: errorHandler.statusCode,
        body: JSON.stringify({
            code: errorHandler.code,
            message: errorHandler.message,
        }),
    };

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

const getVideosByChannelId = async (channelId: string, limit: number):Promise<{videos: Video[], count?: number, nextPageToken?: string}> => {
    const videoRecordsByChannelId = await InfrastructureDynamoDB.getRecordsByDataValue(channelId, limit)
    const count = videoRecordsByChannelId?.count;
    const videoIds = videoRecordsByChannelId?.records.map(r=>r.id);
    const nextPageToken = videoRecordsByChannelId?.nextPageToken;
    console.log(nextPageToken);
    if (videoRecordsByChannelId === undefined || videoIds === undefined) {
        return {
            videos: [],
            count: 0,
            nextPageToken: undefined
        };
    }
    const videos = await Promise.all(videoIds?.map(videoId => Video.init(videoId))) as Video[];
    if (videos === undefined) {
        return {
            videos: [],
            count: 0,
            nextPageToken: undefined
        };
    } else {
        return {
            videos: videos,
            count: videoRecordsByChannelId.count,
            nextPageToken: videoRecordsByChannelId.nextPageToken
        }
    }
}

const getVideos = async (reqParams: requestParams): Promise<APIGatewayProxyResult> => {
    let videos: Video[] = [];
    let count: number | undefined = undefined;
    let nextPageToken: string | undefined = undefined
    if (reqParams.videoId !== undefined) {
        videos = await getVideoByVideoId(reqParams.videoId);
    } else if (reqParams.channelId !== undefined && reqParams.limit !== undefined){
        const videosByChannelId = await getVideosByChannelId(reqParams.channelId, reqParams.limit);
        videos = videosByChannelId.videos;
        count = videosByChannelId.count;
        nextPageToken = videosByChannelId.nextPageToken;
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
                count: count,
                nextPageToken: nextPageToken,
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
    const validatedRequestParams = fulfillReqParams(requestParams);

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
                channelId: 'YT_C_UCmalrXbCEmevDLz7hny5J2A',
                limit: '3'
            },
        } as unknown as APIGatewayProxyEvent;
        const res = await lambdaHandler(event);
    })();
}
