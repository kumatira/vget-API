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
    nextPageToken?: string;
};

type getVideosResponse = {
    videos: Video[];
    count: number;
    nextPageToken?: string;
};

const validateReqParams = (params: any): ErrorHandler | undefined => {
    if (params === null || params === undefined || Object.keys(params).length === 0) {
        return {
            statusCode: 404,
            code: 'RequiredParamIsNotProvidedAtAll',
            message: 'Required Parameter is not provided.',
        };
    }
    if (isBlank(params.videoId) && isBlank(params.channelId)) {
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
            message: 'parameter [limit] must be numeric',
        };
    }
    if (!isBlank(params.limit) && Number(params.limit) > 40) {
        return {
            statusCode: 404,
            code: 'ProvidedLimitParamIsNotNumeric',
            message: 'parameter [limit] must be 40 or less',
        };
    }
    return undefined;
};

const fulfillReqParams = (requestParams: any): requestParams => {
    if (!isBlank(requestParams.videoId)) {
        return {
            videoId: requestParams.videoId,
        };
    }
    if (!isBlank(requestParams.channelId)) {
        return {
            channelId: requestParams.channelId,
            limit: isBlank(requestParams.limit) ? 40 : Number(requestParams.limit),
            nextPageToken: isBlank(requestParams.nextPageToken) ? undefined : requestParams.nextPageToken,
        };
    }
    return {};
};

const makeErrorResponse = (errorHandler: ErrorHandler): APIGatewayProxyResult => {
    const response: APIGatewayProxyResult = {
        statusCode: errorHandler.statusCode,
        body: JSON.stringify({
            code: errorHandler.code,
            message: errorHandler.message,
        }),
    };
    return response;
};

const getVideoByVideoId = async (videoId: string): Promise<getVideosResponse> => {
    const video = await Video.init(videoId);
    if (video === undefined) {
        return {
            videos: [],
            count: 0,
        };
    } else {
        return {
            videos: [video],
            count: 1,
        };
    }
};

const getVideosByChannelId = async (
    channelId: string,
    limit: number,
    nextPageToken?: string
): Promise<getVideosResponse> => {
    const videoRecordsByChannelId = await InfrastructureDynamoDB.getRecordsByDataValue(channelId, limit, nextPageToken);
    if (videoRecordsByChannelId === undefined) {
        return {
            videos: [],
            count: 0,
        };
    }
    const count = videoRecordsByChannelId.count === undefined ? 0 : videoRecordsByChannelId.count;
    const resNextPageToken = videoRecordsByChannelId.nextPageToken;
    const videoIds = videoRecordsByChannelId.records.map((r) => r.id);
    const videos = (await Promise.all(videoIds?.map((videoId) => Video.init(videoId)))) as Video[];
    if (videos === undefined) {
        return {
            videos: [],
            count: 0,
        };
    } else {
        return {
            videos: videos,
            count: count,
            nextPageToken: resNextPageToken,
        };
    }
};

const getVideos = async (reqParams: requestParams): Promise<APIGatewayProxyResult> => {
    let videos: Video[] = [];
    let count: number | undefined = undefined;
    let nextPageToken: string | null = null;
    if (reqParams.videoId !== undefined) {
        const videosByVideoId = await getVideoByVideoId(reqParams.videoId);
        videos = videosByVideoId.videos;
        count = 1;
        nextPageToken = null;
    } else if (reqParams.channelId !== undefined && reqParams.limit !== undefined) {
        const videosByChannelId = await getVideosByChannelId(
            reqParams.channelId,
            reqParams.limit,
            reqParams.nextPageToken
        );
        videos = videosByChannelId.videos;
        count = videosByChannelId.count;
        nextPageToken = videosByChannelId.nextPageToken ?? null;
    }

    const resultVideos = videos.map((v) => {
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
        responseVideoObj.tags = v.tags;
        return responseVideoObj;
    });

    const okResponse: APIGatewayProxyResult = {
        statusCode: 200,
        body: JSON.stringify({
            ResultSet: {
                apiVersion: '0.0.1',
                count: count,
                nextPageToken: nextPageToken,
                videos: resultVideos,
            },
        }),
    };
    return okResponse;
};

const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const requestParams = event.queryStringParameters;
    console.log(`requestBody: ${JSON.stringify(requestParams, null, 2)}`);
    const errorHandler = validateReqParams(requestParams);
    const validatedRequestParams = fulfillReqParams(requestParams);

    const response =
        errorHandler === undefined ? await getVideos(validatedRequestParams) : makeErrorResponse(errorHandler);
    response.headers = {
        'Access-Control-Allow-Origin': '*',
    };
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
                limit: '5',
                nextPageToken:
                    'eyJkYXRhVHlwZSI6IkNoYW5uZWxJRCIsInB1Ymxpc2hlZFVuaXhUaW1lIjoxNjUxOTczMDIxLCJpZCI6IllUX1ZfaTFZVGw0bmV1UnciLCJkYXRhVmFsdWUiOiJZVF9DX1VDbWFsclhiQ0VtZXZETHo3aG55NUoyQSJ9',
            },
        } as unknown as APIGatewayProxyEvent;
        await lambdaHandler(event);
    })();
}
