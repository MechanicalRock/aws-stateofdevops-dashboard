/* eslint-disable @typescript-eslint/no-explicit-any */
import { DynamoDB } from "aws-sdk";

const TABLE_NAME: string = process.env.TABLE_NAME ? process.env.TABLE_NAME : "MetricsEventStore";

export async function createDbEntry(payload: {
    id: string;
    resourceId: string;
    [key: string]: any;
}): Promise<DynamoDB.DocumentClient.PutItemOutput> {
    const db = new DynamoDB.DocumentClient();
    return await db
        .put({
            TableName: TABLE_NAME,
            Item: payload,
        })
        .promise();
}

export async function getDbEntryById(
    id: string,
    resourceId: string,
): Promise<DynamoDB.DocumentClient.AttributeMap | undefined> {
    const db = new DynamoDB.DocumentClient();
    return (
        await db
            .get({
                TableName: TABLE_NAME,
                Key: {
                    id,
                    resourceId,
                },
            })
            .promise()
    ).Item;
}

export async function queryAllUnbookmaredEvents(pipelineName: string): Promise<DynamoDB.DocumentClient.QueryOutput> {
    const db = new DynamoDB.DocumentClient();
    const queryInput: DynamoDB.DocumentClient.QueryInput = {
        TableName: TABLE_NAME,
        IndexName: "pipelineName-index",
        KeyConditionExpression: "pipelineName = :name and bookmarked = :value",
        ExpressionAttributeValues: {
            ":name": pipelineName,
            ":value": "N",
        },
    };
    const results = await db.query(queryInput).promise();
    return results;
}

export async function getLastItemById(id: string): Promise<DynamoDB.DocumentClient.QueryOutput> {
    const db = new DynamoDB.DocumentClient();
    const queryInput: DynamoDB.DocumentClient.QueryInput = {
        TableName: TABLE_NAME,
        KeyConditionExpression: "id = :id",
        ExpressionAttributeValues: {
            ":id": id,
        },
        Limit: 1,
        ScanIndexForward: false,
    };
    const results = await db.query(queryInput).promise();
    return results;
}
