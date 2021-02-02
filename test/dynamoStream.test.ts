import * as AWSMock from "aws-sdk-mock";
import { handler } from "../src/dynamoStream";
import { DynamoDBStreamEvent } from "aws-lambda";
import * as alarmEventStore from "../src/alarmEventStore";

let dynamoPutSpy;
let queryUnbookedmarkEventsSpy;
let getApplicationItemSpy;
let cloudWatchMetricSpy;

describe("dynamoStream", () => {
    beforeEach(async () => {
        setup();
    });

    afterEach(() => {
        AWSMock.restore();
        queryUnbookedmarkEventsSpy.mockRestore();
        dynamoPutSpy.mockRestore();
    });

    describe("Alarm item stream - multiple unbookmarked items in dynamo", () => {
        it("should remove the bookmark key from the items and store them back in dynamo", async () => {
            mockReturn3UnbookedmarkedItems();
            mockReturnEmptyApplicationItem();
            await handler(dynamoMockStreamEvent);

            [
                {
                    value: 1,
                    id: "ALARM_flaky-service",
                    resourceId: "2019-12-30T00:47:41.171+0000",
                    appName: "flaky-service",
                    state: "Alarm",
                },
                {
                    value: 1,
                    id: "ALARM_flaky-service-lambda-errors",
                    resourceId: "2019-12-30T01:47:41.171+0000",
                    appName: "flaky-service",
                    state: "Alarm",
                },
                {
                    value: -1,
                    id: "ALARM_flaky-service-lambda-errors",
                    resourceId: "2019-12-30T02:47:41.171+0000",
                    appName: "flaky-service",
                    state: "OK",
                },
            ].forEach((item) => expect(dynamoPutSpy).toBeCalledWith(item));
        });

        it("should calculate the total score when there is a previouse score stored in dynamo", async () => {
            mockReturn3UnbookedmarkedItems();
            const previousScore = 2;
            mockgetApplicationItem(previousScore);
            await handler(dynamoMockStreamEvent);
            const expected = {
                score: 3,
                id: "flaky-service",
                lastBookmarkedItem: "ALARM_flaky-service-lambda-errors#2019-12-30T02:47:41.171+0000",
                resourceId: "Application_Attribute",
            };
            expect(dynamoPutSpy).toBeCalledWith(expected);
        });

        it("should calculate the total score when there is no previouse score in dynamo", async () => {
            mockReturn3UnbookedmarkedItems();
            mockReturnEmptyApplicationItem();
            await handler(dynamoMockStreamEvent);
            const expected = {
                score: 1,
                id: "flaky-service",
                lastBookmarkedItem: "ALARM_flaky-service-lambda-errors#2019-12-30T02:47:41.171+0000",
                resourceId: "Application_Attribute",
            };
            expect(dynamoPutSpy).toBeCalledWith(expected);
        });
    });

    describe("Alarm item stream - no unbookmarked items in dynamo", () => {
        it("should no store anything in dynamo when there are no unbookmarked item", async () => {
            mockReturn0UnbookedmarkedItem();
            const previousScore = 2;
            mockgetApplicationItem(previousScore);
            await handler(dynamoMockStreamEvent);
            expect(dynamoPutSpy).not.toBeCalledWith();
        });
    });

    describe("Application_Attribute item", () => {
        it("Insert event- should put metrics using the incoming score", async () => {
            const applicationEvent: DynamoDBStreamEvent = { ...dynamoMockStreamEvent };
            applicationEvent.Records[0].dynamodb = mockApplicationItemDynamoObject;
            await handler(applicationEvent);
            expect(cloudWatchMetricSpy).toBeCalled();
        });

        it("Modify event- should put metrics using the incoming score", async () => {
            const applicationEvent: DynamoDBStreamEvent = { ...dynamoMockStreamEvent };
            applicationEvent.Records[0].dynamodb = mockApplicationItemDynamoObject;
            applicationEvent.Records[0].eventName = "MODIFY";
            await handler(applicationEvent);
            expect(cloudWatchMetricSpy).toBeCalled();
        });
    });

    describe("dynamo Modify/Remove events", () => {
        it("should not make any api calls when event is Modify for Alarm Item", async () => {
            const modifyEvent: DynamoDBStreamEvent = { ...dynamoMockStreamEvent };
            modifyEvent.Records[0].eventName = "MODIFY";

            mockReturn0UnbookedmarkedItem();
            const previousScore = 2;
            mockgetApplicationItem(previousScore);
            await handler(modifyEvent);
            expect(dynamoPutSpy).not.toBeCalledWith();
            expect(queryUnbookedmarkEventsSpy).not.toBeCalledWith();
            expect(getApplicationItemSpy).not.toBeCalledWith();
        });

        it("should not make any api calls when event is Remove", async () => {
            const removeEvent: DynamoDBStreamEvent = { ...dynamoMockStreamEvent };
            removeEvent.Records[0].eventName = "REMOVE";

            mockReturn0UnbookedmarkedItem();
            const previousScore = 2;
            mockgetApplicationItem(previousScore);
            await handler(removeEvent);
            expect(dynamoPutSpy).not.toBeCalledWith();
            expect(queryUnbookedmarkEventsSpy).not.toBeCalledWith();
            expect(getApplicationItemSpy).not.toBeCalledWith();
        });
    });
});

function setup() {
    cloudWatchMetricSpy = jest.fn().mockReturnValue({});
    queryUnbookedmarkEventsSpy = jest.spyOn(alarmEventStore, "queryAllUnbookmaredEvents");
    dynamoPutSpy = jest.spyOn(alarmEventStore, "createDbEntry");
    getApplicationItemSpy = jest.spyOn(alarmEventStore, "getDbEntryById");
    process.env.TABLE_NAME = "EventStore";
    mockCreateDBEntry();

    AWSMock.mock("CloudWatch", "putMetricData", (params, callback) => {
        callback(null, cloudWatchMetricSpy(params));
    });
}

function mockgetApplicationItem(previousScore: number) {
    getApplicationItemSpy.mockImplementation(
        jest.fn().mockReturnValue({
            score: previousScore,
            id: "flaky-service",
            lastBookmarkedItem: "ALARM_flaky-service-lambda-errors#2019-12-30T02:47:41.171+0000",
            resourceId: "Application_Attribute",
        }),
    );
}

function mockReturnEmptyApplicationItem() {
    getApplicationItemSpy.mockImplementation(jest.fn().mockReturnValue({}));
}

function mockCreateDBEntry() {
    dynamoPutSpy.mockImplementation(jest.fn().mockReturnValue({}));
}

function mockReturn3UnbookedmarkedItems() {
    queryUnbookedmarkEventsSpy.mockImplementation(
        jest.fn().mockReturnValue({
            Items: [
                {
                    value: 1,
                    bookmarked: "N",
                    id: "ALARM_flaky",
                    resourceId: "2019-12-30T00:47:41.171+0000",
                    appName: "flaky-service",
                    state: "Alarm",
                },
                {
                    value: 1,
                    bookmarked: "N",
                    id: "ALARM_flaky-service-lambda-errors",
                    resourceId: "2019-12-30T01:47:41.171+0000",
                    appName: "flaky-service",
                    state: "Alarm",
                },
                {
                    value: -1,
                    bookmarked: "N",
                    id: "ALARM_flaky-service-lambda-errors",
                    resourceId: "2019-12-30T02:47:41.171+0000",
                    appName: "flaky-service",
                    state: "OK",
                },
            ],
            Count: 3,
            ScannedCount: 3,
        }),
    );
}

function mockReturn0UnbookedmarkedItem() {
    queryUnbookedmarkEventsSpy.mockImplementation(
        jest.fn().mockReturnValue({
            Items: [],
            Count: 0,
            ScannedCount: 0,
        }),
    );
}

const mockApplicationItemDynamoObject = {
    ApproximateCreationDateTime: 1570668037,
    Keys: {
        resourceId: {
            S: "Application_Attribute",
        },
        id: {
            S: "flaky-service",
        },
    },
    NewImage: {
        id: {
            S: "flaky-service",
        },
        lastBookmarkedItem: {
            S: "ALARM_flaky-service#2020-01-06T03:12:41.168+0000",
        },
        resourceId: {
            S: "Application_Attribute",
        },
        score: {
            N: "1",
        },
    },
    SequenceNumber: "12345678901356",
    SizeBytes: 1007,
};

const dynamoMockStreamEvent: DynamoDBStreamEvent = {
    Records: [
        {
            eventID: "123456789",
            eventName: "INSERT",
            eventVersion: "1.1",
            eventSource: "aws:dynamodb",
            awsRegion: "ap-southeast-2",
            dynamodb: {
                ApproximateCreationDateTime: 1570668037,
                Keys: {
                    resourceId: {
                        S: "1570668036460",
                    },
                    id: {
                        S: "ALARM_Flaky-service",
                    },
                },
                NewImage: {
                    resourceId: {
                        S: "1570668036460",
                    },
                    appName: {
                        S: "flaky-service",
                    },
                    id: {
                        S: "ALARM_Flaky-service",
                    },
                    bookmarked: {
                        BOOL: false,
                    },
                    state: {
                        S: "ALARM",
                    },
                    value: {
                        N: "1",
                    },
                },
                SequenceNumber: "12345678901356",
                SizeBytes: 1007,
            },
            eventSourceARN: "arn:aws:dynamodb:ap-southeast-2:123456:table/EventStore/stream/2019-10-09T07:19:23.105",
        },
    ],
};
