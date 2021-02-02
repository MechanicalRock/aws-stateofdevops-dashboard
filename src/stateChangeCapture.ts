/* eslint-disable @typescript-eslint/no-explicit-any */
import { DynamoDB, CloudWatch, SSM } from "aws-sdk";
import { CloudwatchStateChangeEvent, AlarmState } from "./interface";
import { hasStateChanged } from "./utils";
import { createDbEntry, getLastItemById } from "./alarmEventStore";
import { getAppNamesFromSSM } from "./utils";

export interface LastItemState {
    lastStateItemInDynamo: DynamoDB.DocumentClient.AttributeMap | null;
}

export class StateChangeCapture {
    state: LastItemState = {
        lastStateItemInDynamo: null,
    };
    public async run(event: CloudwatchStateChangeEvent): Promise<void> {
        if (event.detail.alarmName.endsWith("-service-health")) {
            return;
        }
        const stateChanged = await this.hasStatusChanged(event);

        if (stateChanged) {
            const score = this.getScore(event.detail.state.value as AlarmState);
            const ssm = new SSM();
            const appNames = await getAppNamesFromSSM(ssm);
            const appName = appNames.find((x) => event.detail.alarmName.includes(x));
            console.log("AppName is:", appName);
            if (!appName) return;
            const payload = {
                id: `ALARM_${event.detail.alarmName}`,
                resourceId: `${event.detail.state.timestamp}`,
                appName,
                bookmarked: "N",
                value: score,
                state: event.detail.state.value,
            };
            await createDbEntry(payload);
        }
    }

    private getScore(alarmState: AlarmState): number {
        if (alarmState === "OK") {
            if (this.state && this.state.lastStateItemInDynamo) {
                return -1;
            }
            return 0;
        }
        return 1;
    }

    private async hasStatusChanged(event: CloudwatchStateChangeEvent): Promise<boolean> {
        const cw = new CloudWatch();
        if (event.detail.state.value === "INSUFFICIENT_DATA") {
            return false;
        }
        const prevState = await this.getPreviousStateFromDynamo(event);

        if (prevState) {
            if (prevState !== event.detail.state.value) {
                return true;
            }
            return false;
        }
        console.log("Dynamo state was undefined");

        const alarmHistory = await cw
            .describeAlarmHistory({
                AlarmName: event.detail.alarmName,
                HistoryItemType: "StateUpdate",
            })
            .promise();
        if (hasStateChanged(alarmHistory)) {
            console.log("State has changed");
            return true;
        }
        console.log("State has not changed");
        return false;
    }

    private async getPreviousStateFromDynamo(event: CloudwatchStateChangeEvent): Promise<string> {
        const data = await getLastItemById("ALARM_" + event.detail.alarmName);
        this.state.lastStateItemInDynamo = data.Items && data.Items.length > 0 ? data.Items[0] : null;
        const prevState = data.Items && data.Items.length > 0 ? data.Items[0].state : null;

        return prevState;
    }
}
