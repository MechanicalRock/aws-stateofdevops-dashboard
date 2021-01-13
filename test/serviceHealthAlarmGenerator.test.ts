import * as AWSMock from "aws-sdk-mock";
import { handler } from "../src/serviceHealthAlarmGenerator";

let cloudWatchDescribeAlarmSpy;
let cloudWatchPutAlarmSpy;
describe("serviceHealthAlarmGenerator", () => {
    const event = {
        account: "123456789012",
        region: "ap-southeast-2",
        detail: {},
        "detail-type": "Scheduled Event",
        source: "aws.events",
        time: "2019-03-01T01:23:45Z",
        id: "cdc73f9d-aea9-11e3-9d5a-835b769c0d9c",
        resources: ["arn:aws:events:ap-southeast-2:123456789012:rule/my-schedule"],
    };
    describe("service health alarms exist", () => {
        beforeEach(() => {
            cloudWatchDescribeAlarmSpy = jest.fn().mockReturnValue({
                ResponseMetadata: { RequestId: "4750a231-6aa0-40ec-a917-5b6362e1ae5c" },
                CompositeAlarms: [],
                MetricAlarms: [
                    {
                        AlarmName: "myapp-service-health",
                        AlarmArn: "arn:aws:cloudwatch:ap-southeast-2:123456789:alarm:myapp-service-health",
                        AlarmDescription:
                            "an overall service health alarm that aggregates the state of all indevidual alarms for myapp",
                        AlarmConfigurationUpdatedTimestamp: "2021-01-13T06:37:05.495Z",
                        ActionsEnabled: true,
                        OKActions: [],
                        AlarmActions: [],
                        InsufficientDataActions: [],
                        StateValue: "INSUFFICIENT_DATA",
                        StateReason: "Unchecked: Initial alarm creation",
                        StateUpdatedTimestamp: "2021-01-13T06:37:05.495Z",
                        MetricName: "product-health-metric",
                        Namespace: "Health-Monitoring",
                        Statistic: "Sum",
                        Dimensions: [Array],
                        Period: 60,
                        EvaluationPeriods: 1,
                        DatapointsToAlarm: 1,
                        Threshold: 1,
                        ComparisonOperator: "GreaterThanOrEqualToThreshold",
                        TreatMissingData: "missing",
                        Metrics: [],
                    },
                ],
            });
            AWSMock.mock("CloudWatch", "describeAlarms", (params, callback) => {
                callback(null, cloudWatchDescribeAlarmSpy(params));
            });
            cloudWatchPutAlarmSpy = jest.fn().mockReturnValue({});
            AWSMock.mock("CloudWatch", "putMetricAlarm", (params, callback) => {
                callback(null, cloudWatchPutAlarmSpy(params));
            });
        });
        afterEach(() => {
            AWSMock.restore();
            cloudWatchDescribeAlarmSpy.mockRestore();
        });
        it("should not create the alarm since the alarm exists", async () => {
            await handler(event);
            expect(cloudWatchDescribeAlarmSpy).toHaveBeenCalled();
            expect(cloudWatchPutAlarmSpy).not.toHaveBeenCalled();
        });
    });

    describe("service health alarms does not exist", () => {
        beforeEach(() => {
            cloudWatchPutAlarmSpy = jest.fn().mockReturnValue({});
            AWSMock.mock("CloudWatch", "putMetricAlarm", (params, callback) => {
                callback(null, cloudWatchPutAlarmSpy(params));
            });
        });
        afterEach(() => {
            AWSMock.restore();
            cloudWatchDescribeAlarmSpy.mockRestore();
        });
        it("should create the alarm when Metric data is empty in describe alarm ", async () => {
            cloudWatchDescribeAlarmSpy = jest.fn().mockReturnValue({
                ResponseMetadata: { RequestId: "4750a231-6aa0-40ec-a917-5b6362e1ae5c" },
                CompositeAlarms: [],
                MetricAlarms: [],
            });
            AWSMock.mock("CloudWatch", "describeAlarms", (params, callback) => {
                callback(null, cloudWatchDescribeAlarmSpy(params));
            });
            await handler(event);
            expect(cloudWatchDescribeAlarmSpy).toHaveBeenCalled();
            expect(cloudWatchPutAlarmSpy).toHaveBeenCalled();
        });

        it("should create the alarm when response is empty object in describe alarm ", async () => {
            cloudWatchDescribeAlarmSpy = jest.fn().mockReturnValue({});
            AWSMock.mock("CloudWatch", "describeAlarms", (params, callback) => {
                callback(null, cloudWatchDescribeAlarmSpy(params));
            });
            await handler(event);
            expect(cloudWatchDescribeAlarmSpy).toHaveBeenCalled();
            expect(cloudWatchPutAlarmSpy).toHaveBeenCalled();
        });

        it("should create the alarm when response is null in describe alarm ", async () => {
            cloudWatchDescribeAlarmSpy = jest.fn().mockReturnValue(null);
            AWSMock.mock("CloudWatch", "describeAlarms", (params, callback) => {
                callback(null, cloudWatchDescribeAlarmSpy(params));
            });
            await handler(event);
            expect(cloudWatchDescribeAlarmSpy).toHaveBeenCalled();
            expect(cloudWatchPutAlarmSpy).toHaveBeenCalled();
        });
    });
});
