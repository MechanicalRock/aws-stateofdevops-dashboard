/* eslint-disable quotes */
import { sanitizePipelineName } from "./stateChangeCapture";
import { getAppNamesFromSSM } from './utils';
const ANNOTATION_ELITE_COLOUR = "#98df8a";
const ANNOTATION_HIGH_COLOUR = "#dbdb8d";
const MEAN_COLOUR = "#2ca02c";

const WIDGET_HEIGHT = 6;
const WIDGET_WIDTH = 12;

// Create a dashboard containing multiple widgets, each based from a consistent template
// The properties here map the metrics to a readable label
// unit conversion is used to convert from seconds to a more meaningful unit, based on the metric.
const MINUTES = {
    unit: 60,
    label: "minutes",
};

const HOURS = {
    unit: 60 * 60,
    label: "hours",
};

const DAYS = {
    unit: 60 * 60 * 24,
    label: "days",
};

const THIRTY_DAYS = 60 * 60 * 24 * 30;

const applyLimits = (state: any) => {
    // See: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_limits.html
    const maxMetricsPerDash = 500;
    const metricsPerWidget = 4;
    const widgetsPerPipeline = 4;
    const maxPipelines = Math.floor(maxMetricsPerDash / (metricsPerWidget * widgetsPerPipeline));

    if (state.pipelineNames.length > maxPipelines) {
        console.warn(`Maximum of ${maxPipelines} allowed in a single dashboard.  Some pipelines will not be reported.`);
        state.pipelineNames = state.pipelineNames.slice(0, maxPipelines);
        state.expectTruncated = true;
        state.yOffset = 2;
    }
};

function deploymentFrequencyWidget(pipelineName: string, y: number, state: any) {
    return {
        type: "metric",
        x: 0,
        y: y,
        width: WIDGET_WIDTH,
        height: WIDGET_HEIGHT,
        properties: {
            metrics: [
                [
                    {
                        expression: "FILL(m2,0)",
                        id: "e2",
                        period: DAYS.unit,
                        region: state.region,
                        yAxis: "left",
                        color: "#ff7f0e",
                        label: "Deployment Frequency",
                    },
                ],
                [{ expression: `m6/PERIOD(m6) * ${DAYS.unit}`, label: "Average (30d)", id: "e1", color: MEAN_COLOUR }],
                [
                    "Pipeline",
                    "SuccessCount",
                    "PipelineName",
                    pipelineName,
                    {
                        period: DAYS.unit,
                        stat: "Sum",
                        id: "m2",
                        visible: false,
                        label: "Deployments",
                    },
                ],
                ["...", { period: THIRTY_DAYS, stat: "Sum", id: "m6", label: "Deployment Freq (30d)", visible: false }],
            ],
            view: "timeSeries",
            region: state.region,
            title: `${pipelineName} Frequency`,
            period: THIRTY_DAYS,
            stacked: false,
            yAxis: {
                left: {
                    label: "deployments / day",
                    showUnits: false,
                    min: 0,
                },
                right: {
                    showUnits: true,
                },
            },
            annotations: {
                horizontal: [
                    {
                        color: ANNOTATION_ELITE_COLOUR,
                        label: "daily",
                        value: 1,
                        fill: "above",
                    },
                    [
                        {
                            color: ANNOTATION_HIGH_COLOUR,
                            label: "multiple per week",
                            value: 0.25,
                        },
                        {
                            value: 1,
                            label: "daily",
                        },
                    ],
                ],
            },
        },
    };
}

function otherWidgets(pipelineName: string, y: number, state: any) {
    return state.widgetMappings.map((mapping: any) => {
        const region = state.region;
        const unitConversion = mapping.unitConversion.unit;
        const label = mapping.label;

        return {
            type: "metric",
            x: mapping.x,
            y: y,
            width: WIDGET_WIDTH,
            height: WIDGET_HEIGHT,
            properties: {
                metrics: [
                    [
                        {
                            expression: `m1/${unitConversion}`,
                            label: `${label}`,
                            id: "e2",
                            period: DAYS.unit,
                            region: region,
                            yAxis: "left",
                            color: "#ff7f0e",
                        },
                    ],
                    [
                        {
                            expression: `FILL(m4,AVG(m4))/${unitConversion}`,
                            label: `${label} (30d - p90)`,
                            id: "e3",
                            region: region,
                            yAxis: "left",
                            color: "#1f77b4",
                        },
                    ],
                    [
                        {
                            expression: `FILL(m5,AVG(m5))/${unitConversion}`,
                            label: `${label} (30d - p10)`,
                            id: "e4",
                            region: region,
                            yAxis: "left",
                            color: "#1f77b4",
                        },
                    ],
                    [
                        {
                            expression: `FILL(m3,AVG(m3))/${unitConversion}`,
                            label: `${label} (30d - p50)`,
                            id: "e5",
                            region: region,
                            color: MEAN_COLOUR,
                        },
                    ],
                    [
                        "Pipeline",
                        mapping.metric,
                        "PipelineName",
                        pipelineName,
                        {
                            label: `${label}`,
                            stat: "Average",
                            color: "#1f77b4",
                            period: DAYS.unit,
                            id: "m1",
                            visible: false,
                        },
                    ],
                    [
                        "...",
                        { stat: "Average", period: THIRTY_DAYS, id: "m3", label: `${label} (30d)`, visible: false },
                    ],
                    ["...", { stat: "p90", period: THIRTY_DAYS, id: "m4", visible: false, label: `${label} (p90)` }],
                    ["...", { stat: "p10", period: THIRTY_DAYS, id: "m5", visible: false, label: `${label} (p10)` }],
                ],
                view: "timeSeries",
                region: region,
                title: `${pipelineName} ${label}`,
                period: THIRTY_DAYS,
                stacked: false,
                yAxis: {
                    left: {
                        min: 0,
                        label: mapping.unitConversion.label,
                        showUnits: false,
                    },
                    right: {
                        showUnits: true,
                    },
                },
                annotations: mapping.annotations,
            },
        };
    });
}

function healthWidgets(pipelineName: string, y: number, state: any) {
    const serviceName = `${sanitizePipelineName(pipelineName)}-service-health`;

    return state.healthWidgetMappings.map((mapping: any) => {
        const region = state.region;
        const unitConversion = mapping.unitConversion.unit;
        const label = mapping.label;

        return {
            type: "metric",
            x: mapping.x,
            y: y + WIDGET_HEIGHT,
            width: WIDGET_WIDTH,
            height: WIDGET_HEIGHT,
            properties: {
                metrics: [
                    [
                        {
                            expression: `m1/${unitConversion}`,
                            label: `${label}`,
                            id: "e2",
                            period: DAYS.unit,
                            region: region,
                            yAxis: "left",
                            color: "#ff7f0e",
                        },
                    ],
                    [
                        {
                            expression: `FILL(m4,AVG(m4))/${unitConversion}`,
                            label: `${label} (30d - p90)`,
                            id: "e3",
                            region: region,
                            yAxis: "left",
                            color: "#1f77b4",
                        },
                    ],
                    [
                        {
                            expression: `FILL(m5,AVG(m5))/${unitConversion}`,
                            label: `${label} (30d - p10)`,
                            id: "e4",
                            region: region,
                            yAxis: "left",
                            color: "#1f77b4",
                        },
                    ],
                    [
                        {
                            expression: `FILL(m3,AVG(m3))/${unitConversion}`,
                            label: `${label} (30d - p50)`,
                            id: "e5",
                            region: region,
                            color: MEAN_COLOUR,
                        },
                    ],
                    [
                        "Operations",
                        mapping.metric,
                        "service",
                        serviceName,
                        {
                            label: `${label}`,
                            stat: "Average",
                            color: "#1f77b4",
                            period: DAYS.unit,
                            id: "m1",
                            visible: false,
                        },
                    ],
                    [
                        "...",
                        { stat: "Average", period: THIRTY_DAYS, id: "m3", label: `${label} (30d)`, visible: false },
                    ],
                    ["...", { stat: "p90", period: THIRTY_DAYS, id: "m4", visible: false, label: `${label} (p90)` }],
                    ["...", { stat: "p10", period: THIRTY_DAYS, id: "m5", visible: false, label: `${label} (p10)` }],
                ],
                view: "timeSeries",
                region: region,
                title: `${pipelineName} ${label}`,
                period: THIRTY_DAYS,
                stacked: false,
                yAxis: {
                    left: {
                        min: 0,
                        label: mapping.unitConversion.label,
                        showUnits: false,
                    },
                    right: {
                        showUnits: true,
                    },
                },
                annotations: mapping.annotations,
            },
        };
    });
}
interface Dashboard {
    start: string;
    widgets: any[];
}
export class StateOfDevOpsDashboardGenerator {
    run(eventPromise: any) {
        return eventPromise.then(this.initializeState).then(this.getPipelines).then(this.putDashboard);
    }

    initializeState(state: any) {
        state.pipelineNames = [];
        state.yOffset = 0;
        state.healthWidgetMappings = [
            {
                x: 0,
                label: "MTBF",
                metric: "MTBF",
                unitConversion: DAYS,
            },
            {
                x: 0 + WIDGET_WIDTH,
                label: "MTTR",
                metric: "MTTR",
                unitConversion: HOURS,
            },
        ];

        state.widgetMappings = [
            {
                x: 0 + WIDGET_WIDTH,
                label: "Lead Time",
                metric: "DeliveryLeadTime",
                unitConversion: MINUTES,
                annotations: {
                    horizontal: [
                        {
                            color: ANNOTATION_ELITE_COLOUR,
                            label: "< 1 hour",
                            value: 60,
                            fill: "below",
                        },
                        [
                            {
                                color: ANNOTATION_HIGH_COLOUR,
                                value: 60,
                                label: "1 hour",
                            },
                            {
                                label: "< 0.5 day",
                                value: 60 * 12,
                            },
                        ],
                    ],
                },
            },
        ];

        return state;
    }

    async getPipelines(state: any) {
        const appNames = await getAppNamesFromSSM(state.ssm);
        console.log("retrieved appnames are: ", appNames);
        if (!appNames || appNames.length === 0) return;
        return new Promise(function (resolve: any, reject: any) {
            state.codepipeline.listPipelines(function (err: any, data: any) {
                if (err) {
                    reject(err);
                    return;
                }
                if (data === null) {
                    resolve(state);
                } else {
                    state.pipelineNames = data.pipelines.map((m: any) => {

                        if (appNames.some(substring => m.name.includes(substring))) { return m.name }

                    })
                    state.pipelineNames = state.pipelineNames.filter(function (element: any) {
                        return element !== undefined;
                    });
                    resolve(state);
                }
            });
        });
    }

    putDashboard(state: any) {
        state.pipelineNames = [...new Set(state.pipelineNames)].sort();
        const period = 60 * 60 * 24 * 30;

        applyLimits(state);

        let y = state.yOffset;

        const dashboard: Dashboard = {
            start: "-P42D",
            widgets: [],
        };

        const TEXT_HEIGHT = 4;
        let x = 0;
        [
            {
                title: "Deployment Frequency",
                description:
                    "How often code is deployed **to production**.  **Higher = better**.\n\n" +
                    "Deploying changes more frequently, in smaller increments, correlates with success.\n\n" +
                    "Elite performers deploy multiple times per day.",
            },
            {
                title: "Lead Time",
                description:
                    "Time from code commit to running in production, including rework.  **Lower = better**.\n\n" +
                    "Reducing lead times reduces cost to value, and improves agility.\n\n" +
                    "Elite performers have lead times less than 1 day.",
            },
            {
                title: "MTBF",
                description:
                    "Mean time between service failures.  **Higher = better**\n\n" +
                    "A stable service improves *Lead Time* and *Deployment Frequency*.\n\n" +
                    "And unstable service suggests systemic quality issues that need to be addressed.",
            },
            {
                title: "MTTR",
                description:
                    "Mean time to fix a failing service.  **Lower = better**\n\n" +
                    "High MTTR negatively effects *Lead Time* and *Deployment Frequency*.\n\n" +
                    'When the service fails, the team should "stop the line" and swarm to fix it.',
            },
            {
                title: "Interpreting the Graphs",
                description:
                    "Each metric is graphed on a daily basis.  There may be gaps in the data if the pipeline did not run.\n\n" +
                    "Charts show the 30-day trend, with p10,p50 and p90 trends. " +
                    "A wide range between p10 + p90 indicates a large variation and outliers. " +
                    "This indicates the metric is uncontrolled.  Work to narrow the variance for improved consistency.\n\n" +
                    "Graphs with annotations show performance in relation to the DORA State of DevOps report.  " +
                    "The green area indicates elite performers; yellow high performers",
                y: 8,
            },
        ].forEach((l) => {
            dashboard.widgets.push({
                type: "text",
                x: x,
                y: y,
                width: l.y ? l.y : 4,
                height: TEXT_HEIGHT,
                properties: {
                    markdown: `### ${l.title}\n${l.description}`,
                },
            });

            x += 4;
        });

        if (state.expectTruncated) {
            dashboard.widgets.push({
                type: "text",
                x: 0,
                y: 0,
                width: 24,
                height: state.yOffset,
                properties: {
                    markdown:
                        "\n### Warning\nMaximum number of allowed pipelines in a single dashboard is reached. Some pipelines will not be reported.",
                },
            });
        }

        y += TEXT_HEIGHT;
        const pipelineWidgets = state.pipelineNames.map((pipelineName: string) => {
            let widget = [deploymentFrequencyWidget(pipelineName, y, state)].concat(
                otherWidgets(pipelineName, y, state),
            );
            widget = widget.concat(healthWidgets(pipelineName, y, state));
            y += 2 * WIDGET_HEIGHT;
            return widget;
        });

        // flatten the nested arrays
        dashboard.widgets = [].concat.apply(dashboard.widgets, pipelineWidgets);

        return state.cloudwatch
            .putDashboard({
                DashboardName: "StateOfDevOps-" + state.region,
                DashboardBody: JSON.stringify(dashboard),
            })
            .promise();
    }
}
