import { CloudWatch, config } from "aws-sdk";

config.region = "ap-southeast-2";
export async function handler(event: any): Promise<void> {
    const cloudwatch = new CloudWatch();
    const params: CloudWatch.DescribeAlarmsInput = {
        AlarmNames: ["test-service-health"],
    };
    try {
        const response = await cloudwatch.describeAlarms(params).promise();
        if (response && response.MetricAlarms && response.MetricAlarms.length > 0) {
            console.log("The alarm exists.\nResponse was: ", response);
            return;
        }
        console.log("Did not find the alarm.");
    } catch (e) {
        console.log("There was an issue finding the alarm: ", e);
    }
}
