/* eslint-disable quotes */
import { ConfigurationServicePlaceholders } from "aws-sdk/lib/config_service_placeholders";
import { stat } from "fs";
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

function accountLevelMetrics(state: any) {
    const accountLevelMetricsWidget = {
        "type": "metric",
        "x": 0,
        "y": 0,
        "width": 24,
        "height": 4,
        "properties": {
            "metrics": [
                ["Pipeline", "SuccessCount", "account", `${state.event.account}`, { "id": "m1", "visible": true, "label": "Deployment-Frequency (Day)" }],
                [".", "DeliveryLeadTime", ".", ".", { "id": "m2", "visible": true, "label": "Lead Time" }],
                ["Operations", "MTTR", ".", ".", { "id": "m3", "visible": true, "label": " MTTR" }],
                [".", "MTBF", ".", ".", { "id": "m4", "visible": true, "label": "MTBF" }],
                [{ "expression": "(m4-m3)/m4", "label": "Availability % (approximately)", "id": "e1" }]
            ],
            "view": "singleValue",
            "stacked": false,
            "region": "ap-southeast-2",
            "stat": "Average",
            "period": 2592000,
            "title": `Account Level Metrics for ${state.event.account}`
        }
    }
    return accountLevelMetricsWidget
}
function getPipelinesBasedonAppName(state: any, appName: string) {
    let matchedPipelines: string[] = [];
    state.pipelineNames?.forEach((element: string) => {
        if (element.includes(appName)) {
            matchedPipelines.push(element)
        }
    });
    return matchedPipelines;
}

function deploymentFrequencyforApplication(appName: string, applicationPipelines: string[], y: number, state: any) {
    const metricObj = []
    let counter = 1;

    applicationPipelines.forEach((element: any) => {
        metricObj.push(
            [
                {
                    expression: `FILL( m${counter + 1},0)`,
                    id: `e${counter + 1}`,
                    period: DAYS.unit,
                    "region": "ap-southeast-2",
                    yAxis: "left",
                    color: "#ff7f0e",
                    label: `${element} Deployment Frequency`,
                    "visible": false
                },
            ],
            [{
                expression: `m${counter}/PERIOD(m${counter}) * ${DAYS.unit}`,
                label: `${element} Average (30d)`, id: `e${counter}`,
                color: MEAN_COLOUR,
                "region": "ap-southeast-2",
                "visible": false
            }],
            [
                "Pipeline",
                "SuccessCount",
                "PipelineName",
                element,
                {
                    period: DAYS.unit,
                    stat: "Sum",
                    id: `m${counter + 1}`,
                    visible: false,
                    label: "Deployments",
                },
            ],
            ["...",
                {
                    period: THIRTY_DAYS,
                    stat: "Sum",
                    id: `m${counter}`,
                    label: `${element} Deployment Freq (30d)`,
                    visible: false
                }])

        counter += 2;
    })

    let cumulativedeploymentFrequency: string = ""
    let cumulativeaverage30d = ""
    for (let i = 1; i < counter; i += 2) {
        const deploymentFrequency = `e${i + 1}`
        const average30d = `e${i}`
        cumulativedeploymentFrequency += deploymentFrequency + "+"
        cumulativeaverage30d += average30d + "+"
    }
    cumulativedeploymentFrequency = cumulativedeploymentFrequency.slice(0, -1);
    cumulativeaverage30d = cumulativeaverage30d.slice(0, -1)
    if (cumulativeaverage30d.includes('+')) {
        cumulativeaverage30d = `(${cumulativeaverage30d})/2`
    }

    metricObj.push(
        [{
            "expression": cumulativedeploymentFrequency,
            "label": `${appName} Application Deployment Frequency`,
            "id": "f1",
            "color": "#ff7f0e"
        }
        ],
        [{
            "expression": cumulativeaverage30d,
            "label": `${appName} Application Average over 30d`,
            "id": "f2",
            "color": "#2ca02c"
        }]
    )
    const deploymentFrequencyWidget = {
        type: "metric",
        x: 0,
        y: y,
        width: WIDGET_WIDTH,
        height: WIDGET_HEIGHT,
        properties: {
            metrics: metricObj,
            view: "timeSeries",
            "region": "ap-southeast-2",
            title: `${appName} Deployment Frequency`,
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
    return deploymentFrequencyWidget
}

function leadTimeForApplication(appName: string, applicationPipelines: String[], y: number, state: any) {
    const metricObj = []
    let counter = 1;
    const unitConversion = state.widgetMappings[0].unitConversion.unit;
    const label = state.widgetMappings[0].label;

    applicationPipelines.forEach((element: any) => {
        metricObj.push(
            [
                {
                    expression: `m${counter}/${unitConversion}`,
                    label: `${element} ${label}`,
                    id: `e${counter}`,
                    period: DAYS.unit,
                    "region": "ap-southeast-2",
                    yAxis: "left",
                    color: "#ff7f0e",
                },
            ],
            [
                {
                    expression: `FILL(m${counter + 2},AVG(m${counter + 2}))/${unitConversion}`,
                    label: `${element} ${label} (30d - p90)`,
                    id: `e${counter + 1}`,
                    "region": "ap-southeast-2",
                    yAxis: "left",
                    color: "#1f77b4",
                },
            ],
            [
                {
                    expression: `FILL(m${counter + 3},AVG(m${counter + 3}))/${unitConversion}`,
                    label: `${element} ${label} (30d - p10)`,
                    id: `e${counter + 2}`,
                    "region": "ap-southeast-2",
                    yAxis: "left",
                    color: "#1f77b4",
                },
            ],
            [
                {
                    expression: `FILL(m${counter + 1},AVG(m${counter + 1}))/${unitConversion}`,
                    label: `${element} ${label} (30d - p50)`,
                    id: `e${counter + 3}`,
                    "region": "ap-southeast-2",
                    color: MEAN_COLOUR,
                },
            ],
            [
                "Pipeline",
                state.widgetMappings[0].metric,
                "PipelineName",
                element,
                {
                    label: `${element} ${label}`,
                    stat: "Average",
                    color: "#1f77b4",
                    period: DAYS.unit,
                    id: `m${counter}`,
                    visible: false,
                },
            ],
            [
                "...",
                { stat: "Average", period: THIRTY_DAYS, id: `m${counter + 1}`, label: `${element} ${label} (30d)`, visible: false },
            ],
            ["...", { stat: "p90", period: THIRTY_DAYS, id: `m${counter + 2}`, visble: false, label: `${element} ${label} (p90)` }],
            ["...", { stat: "p10", period: THIRTY_DAYS, id: `m${counter + 3}`, visible: false, label: `${element} ${label} (p10)` }],
        )

        counter += 4;
    })

    let cumulativeLeadTimeAverage: string = ""
    let cumuluativeLeadTimeAveragep10 = ""
    let cumuluativeLeadTimeAveragep50 = ""
    let cumuluativeLeadTimeAveragep90 = ""

    for (let i = 1; i < counter; i += 4) {
        const leadTimeAverage = `e${i}`
        const leadTimeAveragep90 = `e${i + 1}`
        const leadTimeAveragep10 = `e${i + 2}`
        const leadTimeAveragep50 = `e${i + 3}`
        
        cumulativeLeadTimeAverage += leadTimeAverage + "+"
        cumuluativeLeadTimeAveragep10 += leadTimeAveragep10 + "+"
        cumuluativeLeadTimeAveragep50 += leadTimeAveragep50 + "+"
        cumuluativeLeadTimeAveragep90 += leadTimeAveragep90 + "+"
    }

    cumulativeLeadTimeAverage = cumulativeLeadTimeAverage.slice(0, -1);
    cumuluativeLeadTimeAveragep10 = cumuluativeLeadTimeAveragep10.slice(0, -1)
    cumuluativeLeadTimeAveragep50 = cumuluativeLeadTimeAveragep50.slice(0, -1)
    cumuluativeLeadTimeAveragep90 = cumuluativeLeadTimeAveragep90.slice(0, -1)

    if (cumulativeLeadTimeAverage.includes('+') && cumuluativeLeadTimeAveragep10.includes('+') && cumuluativeLeadTimeAveragep50.includes('+') && cumuluativeLeadTimeAveragep90.includes('+')) {
        cumulativeLeadTimeAverage = `(${cumulativeLeadTimeAverage})/2`
        cumuluativeLeadTimeAveragep10 = `(${cumuluativeLeadTimeAveragep10})/2`
        cumuluativeLeadTimeAveragep50 = `(${cumuluativeLeadTimeAveragep50})/2`
        cumuluativeLeadTimeAveragep90 = `(${cumuluativeLeadTimeAveragep90})/2`
    }


    metricObj.push(
        [{
            "expression": cumulativeLeadTimeAverage,
            "label": `${appName} Application LeadTime`,
            "id": "f1",
            "color": "#ff7f0e"
        }
        ],
        [{ "expression": cumuluativeLeadTimeAveragep10, "label": `${appName} Lead Time (30d - p10)`, "id": "f2", "color": "#1f77b4" }],
        [{ "expression": cumuluativeLeadTimeAveragep50, "label": `${appName} Lead Time (30d - p50)`, "id": "f3", "color": "#1f77b4" }],
        [{ "expression": cumuluativeLeadTimeAveragep90, "label": `${appName} Lead Time (30d - p90)`, "id": "f4", "color": "#2ca02c" }],
    )
    const leadTimeWidget = {
        type: "metric",
        x: state.widgetMappings[0].x,
        y: y,
        width: WIDGET_WIDTH,
        height: WIDGET_HEIGHT,
        properties: {
            metrics: metricObj,
            view: "timeSeries",
            "region": "ap-southeast-2",
            title: `${appName} ${label}`,
            period: THIRTY_DAYS,
            stacked: false,
            yAxis: {
                left: {
                    min: 0,
                    label: state.widgetMappings[0].unitConversion.label,
                    showUnits: false,
                },
                right: {
                    showUnits: true,
                },
            },
            annotations: state.widgetMappings[0].annotations,
        },
    };
    return leadTimeWidget
}

function healthWidgets(applicationName: string, y: number, state: any) {
    const serviceName = `${applicationName}-service-health`;

    return state.healthWidgetMappings.map((mapping: any) => {
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
                            "region": "ap-southeast-2",
                            yAxis: "left",
                            color: "#ff7f0e",
                        },
                    ],
                    [
                        {
                            expression: `FILL(m4,AVG(m4))/${unitConversion}`,
                            label: `${label} (30d - p90)`,
                            id: "e3",
                            "region": "ap-southeast-2",
                            yAxis: "left",
                            color: "#1f77b4",
                        },
                    ],
                    [
                        {
                            expression: `FILL(m5,AVG(m5))/${unitConversion}`,
                            label: `${label} (30d - p10)`,
                            id: "e4",
                            "region": "ap-southeast-2",
                            yAxis: "left",
                            color: "#1f77b4",
                        },
                    ],
                    [
                        {
                            expression: `FILL(m3,AVG(m3))/${unitConversion}`,
                            label: `${label} (30d - p50)`,
                            id: "e5",
                            "region": "ap-southeast-2",
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
                "region": "ap-southeast-2",
                title: `${applicationName} ${label}`,
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

    async initializeState(state: any) {
        state.appNames = [];
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


    async getPipelines(state: any) {

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
                        if (state.appNames.some((substring: any) => m.name.includes(substring))) { return m.name }
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

        dashboard.widgets.push(accountLevelMetrics(state))

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

        let applicationWidgets = state.appNames.map((appName: string) => {
            const applicationPipelines = getPipelinesBasedonAppName(state, appName);
            if (applicationPipelines.length > 0) {
                let widget = [deploymentFrequencyforApplication(appName, applicationPipelines, y, state)].concat(
                    leadTimeForApplication(appName, applicationPipelines, y, state)
                );
                widget = widget.concat(healthWidgets(appName, y, state));
                y += 2 * WIDGET_HEIGHT;
                // let widget = deploymentFrequencyforApplication(appName, applicationPipelines, y, state)
                return widget;
            }
        });
        applicationWidgets = applicationWidgets.filter(function (element: any) {
            return element !== undefined;
        });

        // flatten the nested arrays
        dashboard.widgets = [].concat.apply(dashboard.widgets, applicationWidgets);

        return state.cloudwatch
            .putDashboard({
                DashboardName: "StateOfDevOps-" + state.region,
                DashboardBody: JSON.stringify(dashboard),
            })
            .promise();
    }
}

