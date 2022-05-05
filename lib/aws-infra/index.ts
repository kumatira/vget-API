import { DynamoDBClient, BatchWriteItemCommand, WriteRequest, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import { appConfig } from '../../config/index';
import { isRunOnLocal } from '../util';

export class InfrastructureDynamoDB {
    private static batchThreshold = 25;
    private static makeDDBClient = (): DynamoDBClient => {
        if (isRunOnLocal()) {
            return new DynamoDBClient({
                region: 'ap-northeast-1',
                credentials: fromIni({ profile: appConfig.awsProfile }),
            });
        } else {
            return new DynamoDBClient({
                region: 'ap-northeast-1',
            });
        }
    };

    public static async checkVideoIdIsExistAtDDB(videoId: string): Promise<boolean> {
        const dDBClient = this.makeDDBClient();
        try {
            const tableName = appConfig.dataTableName;
            const result = await dDBClient.send(
                new GetItemCommand({
                    TableName: tableName,
                    Key: {
                        id: { S: `YT_V_${videoId}` },
                        dataType: { S: 'VideoCollectionMetaData' },
                    },
                })
            );
            if (result.Item !== undefined) {
                //項目が存在しない場合はItemがundefinedで返ってくる
                return true;
            } else {
                return false;
            }
        } catch (e: any) {
            console.log(e);
            return false;
        }
    }
}
