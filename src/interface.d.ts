export enum AlarmState {
    OK = "OK",
    ALARM = "ALARM",
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
}

export interface CloudwatchStateChangeEvent {
    version: string;
    id: string;
    "detail-type": string;
    source: string;
    account: string;
    time: string;
    region: string;
    resources: string[];
    detail: {
        alarmName: string;
        state: {
            value: string;
            reason: string;
            reasonData: string;
            timestamp: string;
        };
        previousState: {
            value: string;
            reason: string;
            reasonData: string;
            timestamp: string;
        };
        configuration: {
            description: string;
            metrics?: [
                {
                    id: string;
                    metricStat: {
                        metric: {
                            namespace: string;
                            name: string;
                            dimensions: {
                                FunctionName: string;
                            };
                        };
                        period: number;
                        stat: string;
                    };
                    returnData: boolean;
                },
            ];
        };
    };
}

export interface IHistoryDataType {
    version: "1.0";
    oldState: {
        stateValue: string;
        stateReason: string;
    };
    newState: {
        stateValue: string;
        stateReason: string;
        stateReasonData: {
            version: "1.0";
            queryDate: string;
            startDate: string;
            statistic: string;
            period: number;
            recentDatapoints: number[];
            threshold: number;
        };
    };
}
