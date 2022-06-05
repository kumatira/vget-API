import { InfrastructureDynamoDB, DDBRecord } from '../../lib/aws-infra';

type videoId = string

export class Video {
    readonly id: string;
    readonly title: string;
    readonly channelId: string;
    readonly publishedAt: string;
    readonly actualStartTime?: string;
    readonly actualEndTime?: string;
    readonly scheduledStartTime?: string;
    readonly tags: string[];
    readonly Actors?: string[];
    readonly mainActor?: string;

    private constructor(videoId:videoId , DDBRecords: DDBRecord[]) {
        this.id = videoId;
        this.title = DDBRecords.find((r) => r.dataType === 'VideoTitle')?.dataValue as string;
        this.channelId = DDBRecords.find((r) => r.dataType === 'ChannelID')?.dataValue as string;
        this.publishedAt = DDBRecords.find((r) => r.dataType === 'PublishedAt')?.dataValue as string;
        if (DDBRecords.find((r) => r.dataType === 'ActualStartTime') !== undefined)
            this.actualStartTime = DDBRecords.find((r) => r.dataType === 'ActualStartTime')?.dataValue;
        if (DDBRecords.find((r) => r.dataType === 'ActualEndTime') !== undefined)
            this.actualEndTime = DDBRecords.find((r) => r.dataType === 'ActualEndTime')?.dataValue;
        if (DDBRecords.find((r) => r.dataType === 'ScheduledStartTime') !== undefined)
            this.scheduledStartTime = DDBRecords.find((r) => r.dataType === 'ScheduledStartTime')?.dataValue;
        if (DDBRecords.some((r) => r.dataType.startsWith('Tag:'))) {
            const targetRecords = DDBRecords.filter((r) => r.dataType.startsWith('Tag:')).map(r=>r.dataValue?.replace('Tag:', '')) as string[];
            this.tags = targetRecords;
        } else {
            this.tags = []
        }
    }
    public static async init(videoId: string): Promise<Video | undefined> {
        const DDBRecords: DDBRecord[] | undefined = await InfrastructureDynamoDB.getRecordById(videoId);
        if (DDBRecords === undefined) return;
        if (DDBRecords.length === 0) return;
        return new Video(videoId, DDBRecords);
    }

    public static async isExistVideoId(videoId: string): Promise<boolean> {
        const getItem = await InfrastructureDynamoDB.getItemByTable(videoId, 'ChannelID');
        return getItem !== undefined;
    }
}

export class Tag {
    readonly tag: string;
    readonly videoId: string

    constructor(tagSource: { videoId: string; tag: string }) {
        // e.g. Tag:startTIme:171
        this.videoId = tagSource.videoId;
        this.tag = tagSource.tag;
    }

    getRecordString(): string {
        return `Tag:${this.tag}`;
    }

    public async put(): Promise<undefined> {
        await InfrastructureDynamoDB.putItem({
            id: `${this.videoId}`,
            dataType: this.getRecordString(),
            dataValue: this.getRecordString(),
        });
        return;
    }
}
