/* eslint-disable @typescript-eslint/no-explicit-any */
import { DescribeAlarmHistoryOutput } from "aws-sdk/clients/cloudwatch";
import { AlarmState, IHistoryDataType } from "./interface.d";

export function sortItemsByResourceId(items: AWS.DynamoDB.DocumentClient.QueryOutput): any {
    if (items.Items) {
        const sortedlist = items.Items.sort((a, b) => (a.resourceId > b.resourceId ? 1 : -1));
        return sortedlist;
    }
    return [];
}

export function hasStateChanged(alarmHistory: DescribeAlarmHistoryOutput): boolean {
    const items = alarmHistory.AlarmHistoryItems || [];
    const itemsWithoutInsufficientData = items.filter(
        (item: any) =>
            item.HistoryItemType === "StateUpdate" &&
            item.HistoryData &&
            !itemHasState(item.HistoryData, AlarmState.INSUFFICIENT_DATA),
    );

    const noValidStateChanges = itemsWithoutInsufficientData.length < 2;
    if (noValidStateChanges) {
        return false;
    }

    const newState = getState(itemsWithoutInsufficientData[0].HistoryData);
    const prevState = getState(itemsWithoutInsufficientData[1].HistoryData);
    if (newState !== prevState) {
        return true;
    }
    return false;
}

export function getState(historyDataStr: string | undefined): string {
    const historyData: Partial<IHistoryDataType> = JSON.parse(historyDataStr || "{}") as IHistoryDataType;
    if (historyData.newState && historyData.newState.stateValue) {
        return historyData.newState.stateValue;
    } else {
        console.debug(console.info(`Item state not found in item: ${historyData}`));
        return "unknown";
    }
}

export function itemHasState(historyDataStr: string, state: AlarmState): boolean {
    const newState = getState(historyDataStr);
    return newState === state.toString();
}
