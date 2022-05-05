import { InfrastructureDynamoDB, DDBRecord } from '../../lib/aws-infra';

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

    public static async isExistVideoId(videoId: string): Promise<boolean> {
        const getItem = await InfrastructureDynamoDB.getItemByTable(videoId, 'VideoCollectionMetaData');
        return getItem !== undefined;
    }
}

export class Tag {
    readonly videoId: string;
    readonly key: string;
    readonly value: string;

    constructor(tagSource: TagSource) {
        this.videoId = tagSource.videoId;
        this.key = tagSource.key;
        this.value = tagSource.value;
    }

    getRecordString(): string {
        return `Tag:${this.key}:${this.value}`;
    }

    public async put(): Promise<undefined> {
        await InfrastructureDynamoDB.putItem({
            id: `YT_V_${this.videoId}`,
            dataType: this.getRecordString(),
            dataValue: this.getRecordString(),
        });
        return;
    }
}

export type TagSource = {
    videoId: string;
    key: string;
    value: string;
};
