import { CloudWatch, config, SSM } from "aws-sdk";
import { getAppNamesFromSSM } from "./utils";

config.region = "ap-southeast-2";
export async function handler(event: any): Promise<void> {
    const ssm = new SSM();
    const appNames = await getAppNamesFromSSM(ssm);
    console.log("retrieved appnames are: ", appNames);
    if (!appNames || appNames.length === 0) return;

    const cloudwatch = new CloudWatch();
    const newAppNames = await findAppNamesThatDoNotMatchServiceHealthAlarms(appNames, cloudwatch);
    if (newAppNames.length < 1) return;

    for (let i = 0; i < newAppNames.length; i++) {
        try {
            console.log(`Did not find any alarm named ${newAppNames[i]}-service-health. \nCreating the alarm...`);
            await createServiceHealthAlarm(newAppNames[i], cloudwatch);
        } catch (e) {
            console.log("There was an issue creating the alarm: ", e);
        }
    }
}

async function findAppNamesThatDoNotMatchServiceHealthAlarms(
    appNames: string[],
    cloudwatch: CloudWatch,
): Promise<string[]> {
    const params: CloudWatch.DescribeAlarmsInput = {
        AlarmNames: [],
    };
    for (let i = 0; i < appNames.length; i++) {
        params.AlarmNames?.push(`${appNames[i]}-service-health`);
    }
    try {
        const response = await cloudwatch.describeAlarms(params).promise();
        if (response && response.MetricAlarms && response.MetricAlarms.length > 0) {
            console.log("Service Health Alarms are ", JSON.stringify(response.MetricAlarms));
            const ListOfAlarmNames: string[] = response.MetricAlarms.map((a) => (a.AlarmName ? a.AlarmName : ""));
            const mismatchedAppNames = appNames.filter((x) => !ListOfAlarmNames.includes(`${x}-service-health`));

            console.log("All app names are ", appNames);
            console.log("All alarm names are ", ListOfAlarmNames);
            console.log("Mismatched app names are: ", mismatchedAppNames);
            return mismatchedAppNames;
        }
        return appNames;
    } catch (e) {
        console.log("There was an error finding alarms. The alarm creation will be aborted. Error was:", e);
        return [];
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
