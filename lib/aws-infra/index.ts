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

    public static async getRecordsByDataValue(dataValue: string): Promise<DDBRecord[] | undefined> {
        const dDBClient = this.makeDDBClient();
        try {
            const tableName = appConfig.dataTableName;
            const resultItems = []
            const params:QueryCommandInput  = {
                TableName: tableName,
                IndexName: 'DataValueIndex',
                ExpressionAttributeNames:{'#d': 'dataValue'},
                ExpressionAttributeValues: { ":d": dataValue },
                KeyConditionExpression: "#d = :d",
                ReturnConsumedCapacity: 'TOTAL',
                ExclusiveStartKey: undefined
            }
            let result = undefined;

            do {
                result = await dDBClient.send(
                    new QueryCommand(params)
                );
                resultItems.push(result.Items as DDBRecord[]);
                params.ExclusiveStartKey = result.LastEvaluatedKey
            } while (result.LastEvaluatedKey !== undefined);

            return resultItems.flat();
        } catch (e: any) {
            console.log(e);
            return;
        }
    }

    public static async getVideoByVideoId(videoId: string): Promise<DDBRecord[] | undefined> {
        const dDBClient = this.makeDDBClient();
        try {
            const tableName = appConfig.dataTableName;
            const result = await dDBClient.send(
                new QueryCommand({
                    TableName: tableName,
                    KeyConditionExpression: 'id = :id',
                    ExpressionAttributeValues: {
                        ':id': `${videoId}`,
                    },
                })
            );
            const queriedRecords = result.Items as DDBRecord[];
            return queriedRecords;
        } catch (e: any) {
            console.log(e);
            return;
        }
    }
}
