import * as AWSMock from "aws-sdk-mock";
import { handler } from "../src/serviceHealthAlarmGenerator";

let cloudWatchDescribeAlarmSpy;
let SSMGetParameterSpy;
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
            SSMGetParameterSpy = jest.fn().mockReturnValue({
                Parameters: [
                    {
                        Name: "/state-of-devops/app-names",
                        Type: "StringList",
                        Value: "app1,app2",
                        Version: 3,
                        LastModifiedDate: "2021-01-14T00:27:16.013Z",
                        ARN: "arn:aws:ssm:ap-southeast-2:319524717526:parameter/state-of-devops/app-names",
                        DataType: "text",
                    },
                ],
                InvalidParameters: [],
            });
            AWSMock.mock("SSM", "getParameters", (params, callback) => {
                callback(null, SSMGetParameterSpy(params));
            });
            cloudWatchDescribeAlarmSpy = jest.fn().mockReturnValue({
                ResponseMetadata: { RequestId: "4750a231-6aa0-40ec-a917-5b6362e1ae5c" },
                CompositeAlarms: [],
                MetricAlarms: [
                    {
                        AlarmName: "app1-service-health",
                        AlarmArn: "arn:aws:cloudwatch:ap-southeast-2:123456789:alarm:app1-service-health",
                        AlarmDescription:
                            "an overall service health alarm that aggregates the state of all indevidual alarms for app1",
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
                    {
                        AlarmName: "app2-service-health",
                        AlarmArn: "arn:aws:cloudwatch:ap-southeast-2:123456789:alarm:app2-service-health",
                        AlarmDescription:
                            "an overall service health alarm that aggregates the state of all indevidual alarms for app2",
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
            SSMGetParameterSpy.mockRestore();
        });
        it("should not create any alarms since both alarms exist", async () => {
            await handler(event);
            expect(SSMGetParameterSpy).toHaveBeenCalled();
            expect(cloudWatchDescribeAlarmSpy).toHaveBeenCalled();
            expect(cloudWatchPutAlarmSpy).not.toHaveBeenCalled();
        });
    });

    describe("Only One service health alarm exist", () => {
        beforeEach(() => {
            SSMGetParameterSpy = jest.fn().mockReturnValue({
                Parameters: [
                    {
                        Name: "/state-of-devops/app-names",
                        Type: "StringList",
                        Value: "app1,app2,app3",
                        Version: 3,
                        LastModifiedDate: "2021-01-14T00:27:16.013Z",
                        ARN: "arn:aws:ssm:ap-southeast-2:319524717526:parameter/state-of-devops/app-names",
                        DataType: "text",
                    },
                ],
                InvalidParameters: [],
            });
            AWSMock.mock("SSM", "getParameters", (params, callback) => {
                callback(null, SSMGetParameterSpy(params));
            });
            cloudWatchDescribeAlarmSpy = jest.fn().mockReturnValue({
                ResponseMetadata: { RequestId: "4750a231-6aa0-40ec-a917-5b6362e1ae5c" },
                CompositeAlarms: [],
                MetricAlarms: [
                    {
                        AlarmName: "app2-service-health",
                        AlarmArn: "arn:aws:cloudwatch:ap-southeast-2:123456789:alarm:app2-service-health",
                        AlarmDescription:
                            "an overall service health alarm that aggregates the state of all indevidual alarms for app2",
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
            SSMGetParameterSpy.mockRestore();
        });
        it("should create alarms only for app1 and app3", async () => {
            await handler(event);
            expect(SSMGetParameterSpy).toHaveBeenCalled();
            expect(cloudWatchDescribeAlarmSpy).toHaveBeenCalled();
            expect(cloudWatchPutAlarmSpy).toBeCalledTimes(2);
            expect(cloudWatchPutAlarmSpy).toHaveBeenCalledWith({
                ActionsEnabled: true,
                AlarmDescription:
                    "an overall service health alarm that aggregates the state of all indevidual alarms for app1",
                AlarmName: "app1-service-health",
                ComparisonOperator: "GreaterThanOrEqualToThreshold",
                DatapointsToAlarm: 1,
                Dimensions: [{ Name: "product", Value: "app1" }],
                EvaluationPeriods: 1,
                MetricName: "product-health-metric",
                Namespace: "Health-Monitoring",
                Period: 60,
                Statistic: "Sum",
                Threshold: 1,
                TreatMissingData: "missing",
            });

            expect(cloudWatchPutAlarmSpy).toHaveBeenCalledWith({
                ActionsEnabled: true,
                AlarmDescription:
                    "an overall service health alarm that aggregates the state of all indevidual alarms for app3",
                AlarmName: "app3-service-health",
                ComparisonOperator: "GreaterThanOrEqualToThreshold",
                DatapointsToAlarm: 1,
                Dimensions: [{ Name: "product", Value: "app3" }],
                EvaluationPeriods: 1,
                MetricName: "product-health-metric",
                Namespace: "Health-Monitoring",
                Period: 60,
                Statistic: "Sum",
                Threshold: 1,
                TreatMissingData: "missing",
            });
        });
    });

    describe("irrelevant service health alarms are returned ", () => {
        beforeEach(() => {
            SSMGetParameterSpy = jest.fn().mockReturnValue({
                Parameters: [
                    {
                        Name: "/state-of-devops/app-names",
                        Type: "StringList",
                        Value: "app1,app2,app3",
                        Version: 3,
                        LastModifiedDate: "2021-01-14T00:27:16.013Z",
                        ARN: "arn:aws:ssm:ap-southeast-2:319524717526:parameter/state-of-devops/app-names",
                        DataType: "text",
                    },
                ],
                InvalidParameters: [],
            });
            AWSMock.mock("SSM", "getParameters", (params, callback) => {
                callback(null, SSMGetParameterSpy(params));
            });
            cloudWatchDescribeAlarmSpy = jest.fn().mockReturnValue({
                ResponseMetadata: { RequestId: "4750a231-6aa0-40ec-a917-5b6362e1ae5c" },
                CompositeAlarms: [],
                MetricAlarms: [
                    {
                        AlarmName: "testapp1-service-health",
                        AlarmArn: "arn:aws:cloudwatch:ap-southeast-2:123456789:alarm:testapp1-service-health",
                        AlarmDescription:
                            "an overall service health alarm that aggregates the state of all indevidual alarms for testapp1",
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
                    {
                        AlarmName: "testapp2-service-health",
                        AlarmArn: "arn:aws:cloudwatch:ap-southeast-2:123456789:alarm:testapp2-service-health",
                        AlarmDescription:
                            "an overall service health alarm that aggregates the state of all indevidual alarms for testapp2",
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
            SSMGetParameterSpy.mockRestore();
        });
        it("should create all three service health alarms since the returned alarms do not match app names from SSM", async () => {
            await handler(event);
            expect(SSMGetParameterSpy).toHaveBeenCalled();
            expect(cloudWatchDescribeAlarmSpy).toHaveBeenCalled();
            expect(cloudWatchPutAlarmSpy).toBeCalledTimes(3);
            expect(cloudWatchPutAlarmSpy).toHaveBeenCalledWith({
                ActionsEnabled: true,
                AlarmDescription:
                    "an overall service health alarm that aggregates the state of all indevidual alarms for app1",
                AlarmName: "app1-service-health",
                ComparisonOperator: "GreaterThanOrEqualToThreshold",
                DatapointsToAlarm: 1,
                Dimensions: [{ Name: "product", Value: "app1" }],
                EvaluationPeriods: 1,
                MetricName: "product-health-metric",
                Namespace: "Health-Monitoring",
                Period: 60,
                Statistic: "Sum",
                Threshold: 1,
                TreatMissingData: "missing",
            });

            expect(cloudWatchPutAlarmSpy).toHaveBeenCalledWith({
                ActionsEnabled: true,
                AlarmDescription:
                    "an overall service health alarm that aggregates the state of all indevidual alarms for app2",
                AlarmName: "app2-service-health",
                ComparisonOperator: "GreaterThanOrEqualToThreshold",
                DatapointsToAlarm: 1,
                Dimensions: [{ Name: "product", Value: "app2" }],
                EvaluationPeriods: 1,
                MetricName: "product-health-metric",
                Namespace: "Health-Monitoring",
                Period: 60,
                Statistic: "Sum",
                Threshold: 1,
                TreatMissingData: "missing",
            });
            expect(cloudWatchPutAlarmSpy).toHaveBeenCalledWith({
                ActionsEnabled: true,
                AlarmDescription:
                    "an overall service health alarm that aggregates the state of all indevidual alarms for app3",
                AlarmName: "app3-service-health",
                ComparisonOperator: "GreaterThanOrEqualToThreshold",
                DatapointsToAlarm: 1,
                Dimensions: [{ Name: "product", Value: "app3" }],
                EvaluationPeriods: 1,
                MetricName: "product-health-metric",
                Namespace: "Health-Monitoring",
                Period: 60,
                Statistic: "Sum",
                Threshold: 1,
                TreatMissingData: "missing",
            });
        });
    });

    describe("some relevant and some irrelevant service health alarms are returned ", () => {
        beforeEach(() => {
            SSMGetParameterSpy = jest.fn().mockReturnValue({
                Parameters: [
                    {
                        Name: "/state-of-devops/app-names",
                        Type: "StringList",
                        Value: "app1,app2,app3",
                        Version: 3,
                        LastModifiedDate: "2021-01-14T00:27:16.013Z",
                        ARN: "arn:aws:ssm:ap-southeast-2:319524717526:parameter/state-of-devops/app-names",
                        DataType: "text",
                    },
                ],
                InvalidParameters: [],
            });
            AWSMock.mock("SSM", "getParameters", (params, callback) => {
                callback(null, SSMGetParameterSpy(params));
            });
            cloudWatchDescribeAlarmSpy = jest.fn().mockReturnValue({
                ResponseMetadata: { RequestId: "4750a231-6aa0-40ec-a917-5b6362e1ae5c" },
                CompositeAlarms: [],
                MetricAlarms: [
                    {
                        AlarmName: "testapp1-service-health",
                        AlarmArn: "arn:aws:cloudwatch:ap-southeast-2:123456789:alarm:testapp1-service-health",
                        AlarmDescription:
                            "an overall service health alarm that aggregates the state of all indevidual alarms for testapp1",
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
                    {
                        AlarmName: "app2-service-health",
                        AlarmArn: "arn:aws:cloudwatch:ap-southeast-2:123456789:alarm:app2-service-health",
                        AlarmDescription:
                            "an overall service health alarm that aggregates the state of all indevidual alarms for app2",
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
            SSMGetParameterSpy.mockRestore();
        });
        it("should create all two service health alarms since one alarm already exist. It should also ignore irrelevant alarms", async () => {
            await handler(event);
            expect(SSMGetParameterSpy).toHaveBeenCalled();
            expect(cloudWatchDescribeAlarmSpy).toHaveBeenCalled();
            expect(cloudWatchPutAlarmSpy).toBeCalledTimes(2);
            expect(cloudWatchPutAlarmSpy).toHaveBeenCalledWith({
                ActionsEnabled: true,
                AlarmDescription:
                    "an overall service health alarm that aggregates the state of all indevidual alarms for app1",
                AlarmName: "app1-service-health",
                ComparisonOperator: "GreaterThanOrEqualToThreshold",
                DatapointsToAlarm: 1,
                Dimensions: [{ Name: "product", Value: "app1" }],
                EvaluationPeriods: 1,
                MetricName: "product-health-metric",
                Namespace: "Health-Monitoring",
                Period: 60,
                Statistic: "Sum",
                Threshold: 1,
                TreatMissingData: "missing",
            });

            expect(cloudWatchPutAlarmSpy).toHaveBeenCalledWith({
                ActionsEnabled: true,
                AlarmDescription:
                    "an overall service health alarm that aggregates the state of all indevidual alarms for app3",
                AlarmName: "app3-service-health",
                ComparisonOperator: "GreaterThanOrEqualToThreshold",
                DatapointsToAlarm: 1,
                Dimensions: [{ Name: "product", Value: "app3" }],
                EvaluationPeriods: 1,
                MetricName: "product-health-metric",
                Namespace: "Health-Monitoring",
                Period: 60,
                Statistic: "Sum",
                Threshold: 1,
                TreatMissingData: "missing",
            });
        });
    });

    describe("service health alarms does not exist", () => {
        beforeEach(() => {
            SSMGetParameterSpy = jest.fn().mockReturnValue({
                Parameters: [
                    {
                        Name: "/state-of-devops/app-names",
                        Type: "StringList",
                        Value: "app1,app2",
                        Version: 3,
                        LastModifiedDate: "2021-01-14T00:27:16.013Z",
                        ARN: "arn:aws:ssm:ap-southeast-2:319524717526:parameter/state-of-devops/app-names",
                        DataType: "text",
                    },
                ],
                InvalidParameters: [],
            });
            AWSMock.mock("SSM", "getParameters", (params, callback) => {
                callback(null, SSMGetParameterSpy(params));
            });
            cloudWatchPutAlarmSpy = jest.fn().mockReturnValue({});
            AWSMock.mock("CloudWatch", "putMetricAlarm", (params, callback) => {
                callback(null, cloudWatchPutAlarmSpy(params));
            });
        });
        afterEach(() => {
            AWSMock.restore();
            cloudWatchDescribeAlarmSpy.mockRestore();
            SSMGetParameterSpy.mockRestore();
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
            expect(cloudWatchPutAlarmSpy).toBeCalledTimes(2);
            expect(cloudWatchPutAlarmSpy).toHaveBeenCalledWith({
                ActionsEnabled: true,
                AlarmDescription:
                    "an overall service health alarm that aggregates the state of all indevidual alarms for app1",
                AlarmName: "app1-service-health",
                ComparisonOperator: "GreaterThanOrEqualToThreshold",
                DatapointsToAlarm: 1,
                Dimensions: [{ Name: "product", Value: "app1" }],
                EvaluationPeriods: 1,
                MetricName: "product-health-metric",
                Namespace: "Health-Monitoring",
                Period: 60,
                Statistic: "Sum",
                Threshold: 1,
                TreatMissingData: "missing",
            });

            expect(cloudWatchPutAlarmSpy).toHaveBeenCalledWith({
                ActionsEnabled: true,
                AlarmDescription:
                    "an overall service health alarm that aggregates the state of all indevidual alarms for app2",
                AlarmName: "app2-service-health",
                ComparisonOperator: "GreaterThanOrEqualToThreshold",
                DatapointsToAlarm: 1,
                Dimensions: [{ Name: "product", Value: "app2" }],
                EvaluationPeriods: 1,
                MetricName: "product-health-metric",
                Namespace: "Health-Monitoring",
                Period: 60,
                Statistic: "Sum",
                Threshold: 1,
                TreatMissingData: "missing",
            });
        });

        it("should create the alarm when response is empty object in describe alarm ", async () => {
            cloudWatchDescribeAlarmSpy = jest.fn().mockReturnValue({});
            AWSMock.mock("CloudWatch", "describeAlarms", (params, callback) => {
                callback(null, cloudWatchDescribeAlarmSpy(params));
            });
            await handler(event);
            expect(cloudWatchDescribeAlarmSpy).toHaveBeenCalled();

            expect(cloudWatchPutAlarmSpy).toBeCalledTimes(2);
            expect(cloudWatchPutAlarmSpy).toHaveBeenCalledWith({
                ActionsEnabled: true,
                AlarmDescription:
                    "an overall service health alarm that aggregates the state of all indevidual alarms for app1",
                AlarmName: "app1-service-health",
                ComparisonOperator: "GreaterThanOrEqualToThreshold",
                DatapointsToAlarm: 1,
                Dimensions: [{ Name: "product", Value: "app1" }],
                EvaluationPeriods: 1,
                MetricName: "product-health-metric",
                Namespace: "Health-Monitoring",
                Period: 60,
                Statistic: "Sum",
                Threshold: 1,
                TreatMissingData: "missing",
            });

            expect(cloudWatchPutAlarmSpy).toHaveBeenCalledWith({
                ActionsEnabled: true,
                AlarmDescription:
                    "an overall service health alarm that aggregates the state of all indevidual alarms for app2",
                AlarmName: "app2-service-health",
                ComparisonOperator: "GreaterThanOrEqualToThreshold",
                DatapointsToAlarm: 1,
                Dimensions: [{ Name: "product", Value: "app2" }],
                EvaluationPeriods: 1,
                MetricName: "product-health-metric",
                Namespace: "Health-Monitoring",
                Period: 60,
                Statistic: "Sum",
                Threshold: 1,
                TreatMissingData: "missing",
            });
        });

        it("should create the alarm when response is null in describe alarm ", async () => {
            cloudWatchDescribeAlarmSpy = jest.fn().mockReturnValue(null);
            AWSMock.mock("CloudWatch", "describeAlarms", (params, callback) => {
                callback(null, cloudWatchDescribeAlarmSpy(params));
            });
            await handler(event);
            expect(cloudWatchDescribeAlarmSpy).toHaveBeenCalled();

            expect(cloudWatchPutAlarmSpy).toBeCalledTimes(2);
            expect(cloudWatchPutAlarmSpy).toHaveBeenCalledWith({
                ActionsEnabled: true,
                AlarmDescription:
                    "an overall service health alarm that aggregates the state of all indevidual alarms for app1",
                AlarmName: "app1-service-health",
                ComparisonOperator: "GreaterThanOrEqualToThreshold",
                DatapointsToAlarm: 1,
                Dimensions: [{ Name: "product", Value: "app1" }],
                EvaluationPeriods: 1,
                MetricName: "product-health-metric",
                Namespace: "Health-Monitoring",
                Period: 60,
                Statistic: "Sum",
                Threshold: 1,
                TreatMissingData: "missing",
            });

            expect(cloudWatchPutAlarmSpy).toHaveBeenCalledWith({
                ActionsEnabled: true,
                AlarmDescription:
                    "an overall service health alarm that aggregates the state of all indevidual alarms for app2",
                AlarmName: "app2-service-health",
                ComparisonOperator: "GreaterThanOrEqualToThreshold",
                DatapointsToAlarm: 1,
                Dimensions: [{ Name: "product", Value: "app2" }],
                EvaluationPeriods: 1,
                MetricName: "product-health-metric",
                Namespace: "Health-Monitoring",
                Period: 60,
                Statistic: "Sum",
                Threshold: 1,
                TreatMissingData: "missing",
            });
        });
    });
});
