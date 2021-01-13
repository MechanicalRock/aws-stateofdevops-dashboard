import { CloudWatch, config } from "aws-sdk";

config.region = "ap-southeast-2";
export async function handler(event: any): Promise<void> {
    const appName = "test";
    const cloudwatch = new CloudWatch();
    const params: CloudWatch.DescribeAlarmsInput = {
        AlarmNames: [`${appName}-service-health`],
    };
    try {
        const response = await cloudwatch.describeAlarms(params).promise();
        if (response && response.MetricAlarms && response.MetricAlarms.length > 0) {
            console.log("The alarm exists.\nResponse was: ", response);
            return;
        }
        console.log(`Did not find any alarm named ${appName}-service-health. \nCreating the alarm...`);
        await createServiceHealthAlarm(appName, cloudwatch);
    } catch (e) {
        console.log("There was an issue finding the alarm: ", e);
    }
}

async function createServiceHealthAlarm(appName: string, cloudwatch: CloudWatch): Promise<void> {
    const params: CloudWatch.PutMetricAlarmInput = {
        AlarmName: `${appName}-service-health`,
        ComparisonOperator: "GreaterThanOrEqualToThreshold",
        EvaluationPeriods: 1,
        ActionsEnabled: true,
        AlarmDescription: `an overall service health alarm that aggregates the state of all indevidual alarms for ${appName}`,
        DatapointsToAlarm: 1,
        Dimensions: [
            {
                Name: "product",
                Value: appName,
            },
        ],
        MetricName: "product-health-metric",
        Namespace: "Health-Monitoring",
        Period: 60,
        Statistic: "Sum",
        Threshold: 1,
        TreatMissingData: "missing",
    };
    await cloudwatch.putMetricAlarm(params).promise();
}
