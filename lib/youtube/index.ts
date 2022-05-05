import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { InfrastructureDynamoDB, DDBRecord } from '../../lib/aws-infra';
import { appConfig } from '../../config/index';

type VideoThumbnails = {
    default?: string;
    medium?: string;
    high?: string;
    standard?: string;
    maxres?: string;
};

type VideoThumbnailKeys = keyof VideoThumbnails;

export class Video {
    readonly id: string;
    readonly title: string;
    readonly channelId: string;
    readonly publishedAt: string;
    readonly actualStartTime?: string;
    readonly actualEndTime?: string;
    readonly scheduledStartTime?: string;
    readonly Actors?: string[];
    readonly mainActor?: string;

    constructor(DDBRecords: DDBRecord[]) {
        this.id = DDBRecords.find((r) => r.dataType === 'VideoCollectionMetaData')?.id as string;
        this.title = DDBRecords.find((r) => r.dataType === 'VideoTitle')?.dataValue as string;
        this.channelId = DDBRecords.find((r) => r.dataType === 'ChannelID')?.dataValue as string;
        this.publishedAt = DDBRecords.find((r) => r.dataType === 'PublishedAt')?.dataValue as string;
        if (DDBRecords.find((r) => r.dataType === 'ActualStartTime') !== undefined)
            this.actualStartTime = DDBRecords.find((r) => r.dataType === 'ActualStartTime')?.dataValue;
        if (DDBRecords.find((r) => r.dataType === 'ActualEndTime') !== undefined)
            this.actualEndTime = DDBRecords.find((r) => r.dataType === 'ActualEndTime')?.dataValue;
        if (DDBRecords.find((r) => r.dataType === 'ScheduledStartTime') !== undefined)
            this.scheduledStartTime = DDBRecords.find((r) => r.dataType === 'ScheduledStartTime')?.dataValue;
    }
    public static async init(videoId: string): Promise<Video | undefined> {
        const DDBRecords: DDBRecord[] | undefined = await InfrastructureDynamoDB.getVideoByVideoId(videoId);
        if (DDBRecords === undefined) return;
        if (DDBRecords.length === 0) return;
        return new Video(DDBRecords);
    }
}
