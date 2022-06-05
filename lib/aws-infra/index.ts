import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import { Tag } from '../../lib/youtube';
import { appConfig } from '../../config/index';
import { isRunOnLocal } from '../util';

export type DDBRecord = {
    id: string;
    dataType: string;
    dataValue?: string;
    collection?: {
        operationType: string;
        at: string;
        by: string;
    };
    tags?: Tag[];
};

type DDBRecordsResponse = {
    records: DDBRecord[];
    count?: number;
    nextPageToken?: string;
};

export class InfrastructureDynamoDB {
    private static makeDDBClient = (): DynamoDBDocumentClient => {
        if (isRunOnLocal()) {
            return DynamoDBDocumentClient.from(
                new DynamoDBClient({
                    region: 'ap-northeast-1',
                    credentials: fromIni({ profile: appConfig.awsProfile }),
                })
            );
        } else {
            return DynamoDBDocumentClient.from(
                new DynamoDBClient({
                    region: 'ap-northeast-1',
                })
            );
        }
    };

    public static async putItem(putData: DDBRecord): Promise<undefined> {
        const dDBClient = this.makeDDBClient();
        try {
            const tableName = appConfig.dataTableName;
            await dDBClient.send(
                new PutCommand({
                    TableName: tableName,
                    Item: putData,
                })
            );
            return;
        } catch (e: any) {
            console.log(e);
            return;
        }
    }

    public static async getItemByTable(id: string, dataType: string): Promise<DDBRecord | undefined> {
        const dDBClient = this.makeDDBClient();
        try {
            const tableName = appConfig.dataTableName;
            const result = await dDBClient.send(
                new GetCommand({
                    TableName: tableName,
                    Key: {
                        id: `${id}`,
                        dataType: dataType,
                    },
                })
            );
            const getItem = result.Item as DDBRecord;
            return getItem;
        } catch (e: any) {
            console.log(e);
            return;
        }
    }

    public static async getRecordsByDataValue(
        dataValue: string,
        limit: number,
        nextPageToken?: string
    ): Promise<DDBRecordsResponse | undefined> {
        const dDBClient = this.makeDDBClient();
        try {
            const tableName = appConfig.dataTableName;
            const exclusiveStartKey =
                nextPageToken === undefined ? undefined : JSON.parse(Buffer.from(nextPageToken, 'base64').toString());
            const params: QueryCommandInput = {
                TableName: tableName,
                IndexName: 'DataValueIndex',
                ScanIndexForward: false,
                ExpressionAttributeNames: { '#d': 'dataValue' },
                ExpressionAttributeValues: { ':d': dataValue },
                KeyConditionExpression: '#d = :d',
                ReturnConsumedCapacity: 'TOTAL',
                Limit: limit,
                ExclusiveStartKey: exclusiveStartKey,
            };

            const result = await dDBClient.send(new QueryCommand(params));
            const token =
                result.LastEvaluatedKey === undefined
                    ? undefined
                    : Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
            const resultItems = result.Items as DDBRecord[];
            return {
                records: resultItems,
                count: result.Count as number,
                nextPageToken: token,
            };
        } catch (e: any) {
            console.log(e);
            return;
        }
    }

    public static async getRecordById(id: string): Promise<DDBRecord[] | undefined> {
        const dDBClient = this.makeDDBClient();
        try {
            const tableName = appConfig.dataTableName;
            const result = await dDBClient.send(
                new QueryCommand({
                    TableName: tableName,
                    ExpressionAttributeNames: { '#i': 'id' },
                    ExpressionAttributeValues: { ':i': `${id}` },
                    KeyConditionExpression: '#i = :i',
                })
            );
            if (result.Items === undefined) {
                return;
            }
            const queriedRecords = result.Items;
            return queriedRecords as DDBRecord[];
        } catch (e: any) {
            console.log(e);
            return;
        }
    }
}
