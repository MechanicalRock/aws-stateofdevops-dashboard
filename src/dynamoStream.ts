/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { sortItemsByResourceId } from "./utils";
import { CloudWatch, DynamoDB } from "aws-sdk";
import { DynamoDBStreamEvent } from "aws-lambda";
import { getDbEntryById, queryAllUnbookmaredEvents, createDbEntry } from "./alarmEventStore";

export interface payload {
    id: string;
    resourceId: string;
    [key: string]: any;
}

export const handler = async (event: DynamoDBStreamEvent) => {
    console.log("stream event is: ", JSON.stringify(event));
    for (let i = 0; i < event.Records.length; i++) {
        const record = event.Records[i];

        if (!record.dynamodb || !record.dynamodb.Keys) {
            throw new Error("Unstructured dynamo record");
        }

        try {
            switch (record.eventName) {
                case "MODIFY": {
                    const converter = DynamoDB.Converter.unmarshall;
                    if (record.dynamodb.NewImage) {
                        const newRecord = converter(record.dynamodb.NewImage);
                        const resourceId = newRecord.resourceId;

                        if (resourceId === "Pipeline_Attribute") {
                            await putMetric(newRecord);
                            break;
                        }
                    }
                    break;
                }
                case "INSERT": {
                    const converter = DynamoDB.Converter.unmarshall;
                    if (record.dynamodb.NewImage) {
                        const newRecord = converter(record.dynamodb.NewImage);
                        const id = newRecord.id;
                        if (id.startsWith("ALARM_")) {
                            await updatePipelineScore(newRecord);
                            break;
                        }
                        const resourceId = newRecord.resourceId;
                        if (resourceId === "Pipeline_Attribute") {
                            await putMetric(newRecord);
                            break;
                        }
                    }
                    break;
                }
                case "REMOVE": {
                    break;
                }
                default:
                    throw new Error(record.eventName + " wasn't recognized");
            }
        } catch (e) {
            console.log(e);
            console.log("Failed to process stream record. Continuing without it");
        }
    }
    return "Stream handling completed";
};

async function updatePipelineScore(newRecord: any) {
    const list = await queryAllUnbookmaredEvents(newRecord.pipelineName);
    const sortedList = sortItemsByResourceId(list);

    if (sortedList && sortedList.length > 0) {
        const score = await calculateTheScore(sortedList, newRecord.pipelineName);
        const payload = {
            id: newRecord.pipelineName,
            resourceId: "Pipeline_Attribute",
            score: score,
            lastBookmarkedItem: `${sortedList[sortedList.length - 1].id}#${
                sortedList[sortedList.length - 1].resourceId
            }`,
        };
        await createDbEntry(payload);
        // update the list with removing the bookmark key therefore removing them from GSI (sparse GSI)
        for (let i = 0; i < sortedList.length; i++) {
            const currentItem = sortedList[i];
            delete currentItem.bookmarked;
            await createDbEntry(currentItem as payload);
        }
    }
}

async function calculateTheScore(sortedList: any, pipelineName: string) {
    let score = 0;
    sortedList.forEach((item: any) => {
        score = score + item.value;
    });

    const item = await getDbEntryById(pipelineName, "Pipeline_Attribute");
    if (item && item.score) {
        score = score + item.score;
    }
    return score;
}

async function putMetric(newRecord: any) {
    const cw = new CloudWatch();
    const pipelineName = newRecord.id;
    const timeStamp = new Date();

    await cw
        .putMetricData({
            MetricData: [
                {
                    MetricName: "product-health-metric",
                    Dimensions: [
                        {
                            Name: "product",
                            Value: pipelineName,
                        },
                    ],
                    Timestamp: timeStamp,
                    Value: newRecord.score,
                    Unit: "Count",
                },
            ],
            Namespace: "Health-Monitoring",
        })
        .promise();
}
