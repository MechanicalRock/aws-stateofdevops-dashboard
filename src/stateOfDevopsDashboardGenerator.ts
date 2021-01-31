/* eslint-disable quotes */
import { getAppNamesFromSSM } from "./utils";

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

function getPipelinesForAnAppName(appName: string, state: any) {
    const matchedPipelines = state.pipelineNames.filter((x: string) => x.includes(appName));
    return matchedPipelines;
}

function deploymentFrequencyWidget(appName: string, y: number, state: any) {
    console.log("Start of deployment frequency");
    const pipelines = getPipelinesForAnAppName(appName, state);
    console.log(`list of pipelines matching with ${appName} are : ${JSON.stringify(pipelines)}`);
    const metrics = [];
    let averageEquation = "";
    for (let i = 0; i < pipelines.length; i++) {
        metrics.push([
            "Pipeline",
            "SuccessCount",
            "PipelineName",
            pipelines[i],
            {
                period: DAYS.unit,
                stat: "Sum",
                id: `m${i}`,
                visible: false,
                label: `Deployments - ${pipelines[i]}`,
            },
        ]);
        metrics.push([
            {
                expression: `FILL(m${i},0)`,
                id: `e${i}`,
                period: DAYS.unit,
                region: state.region,
                yAxis: "left",
                color: "#ff7f0e",
                label: `Deployment Frequency- ${pipelines[i]}`,
            },
        ]);
        averageEquation = i === 0 ? `m${i}` : averageEquation + `,m${i}`;
    }
    metrics.push([
        {
            expression: `AVG([${averageEquation}])`,
            id: `e500`,
            period: DAYS.unit,
            region: state.region,
            yAxis: "left",
            color: "#1f77b4",
            label: "Average Deployment Frequency",
        },
    ]);
    return {
        type: "metric",
        x: 0,
        y: y,
        width: WIDGET_WIDTH,
        height: WIDGET_HEIGHT,
        properties: {
            metrics: metrics,
            view: "timeSeries",
            region: state.region,
            title: `${appName} Frequency`,
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

function otherWidgets(appName: string, y: number, state: any) {
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
                        appName,
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
                title: `${appName} ${label}`,
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

function healthWidgets(appName: string, y: number, state: any) {
    const serviceName = `${appName}-service-health`;

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
                title: `${appName} ${label}`,
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
    async run(eventPromise: any) {
        return await eventPromise.then(this.initializeState).then(this.getPipelines).then(this.putDashboard);
    }

    async initializeState(state: any) {
        state.appNames = await getAppNamesFromSSM(state.ssm);
        console.log("retrieved appnames are: ", state.appNames);
        if (!state.appNames || state.appNames.length === 0) return;

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

    getPipelines(state: any) {
        return new Promise(function (resolve: any, reject: any) {
            state.codepipeline.listPipelines(function (err: any, data: any) {
                if (err) {
                    reject(err);
                    return;
                }
                if (data === null) {
                    resolve(state);
                } else {
                    state.pipelineNames = data.pipelines.map((m: any) => m.name);
                    resolve(state);
                }
            });
        });
    }

    putDashboard(state: any) {
        state.pipelineNames = [...new Set(state.pipelineNames)].sort();

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
        const appWidgets = state.appNames.map((appName: string) => {
            let widget = [deploymentFrequencyWidget(appName, y, state)].concat(otherWidgets(appName, y, state));

            widget = widget.concat(healthWidgets(appName, y, state));
            console.log("Widgets are: ", JSON.stringify(widget));
            y += 2 * WIDGET_HEIGHT;
            return widget;
        });

        // flatten the nested arrays
        dashboard.widgets = [].concat.apply(dashboard.widgets, appWidgets);
        console.log("Final dashboard is: ", JSON.stringify(dashboard));

        return state.cloudwatch
            .putDashboard({
                DashboardName: "StateOfDevOps-" + state.region,
                DashboardBody: JSON.stringify(dashboard),
            })
            .promise();
    }
}
