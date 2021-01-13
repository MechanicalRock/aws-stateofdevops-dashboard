import { CloudWatch } from "aws-sdk";

export async function handler(event: any): Promise<void> {
    const cloudwatch = new CloudWatch();
    const params: CloudWatch.DescribeAlarmsInput = {
        AlarmNames: ["test-service-health"],
    };
    cloudwatch.describeAlarms(params, function (err, data) {
        if (err) console.log("Did not find the alarm. ", err, err.stack);
        else console.log("Found the alarm. ", data);
    });
}
