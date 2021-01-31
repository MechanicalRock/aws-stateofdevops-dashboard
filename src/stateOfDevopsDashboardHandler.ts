import { Handler } from "aws-lambda";
import { StateOfDevOpsDashboardGenerator } from "./stateOfDevopsDashboardGenerator";
import { CloudWatch, CodePipeline, SSM } from "aws-sdk";

export const handler: Handler = async (event) => {
    const statePromise = Promise.resolve({
        event,
        region: process.env["AWS_REGION"],
        cloudwatch: new CloudWatch(),
        codepipeline: new CodePipeline(),
        ssm: new SSM(),
    });

    await new StateOfDevOpsDashboardGenerator().run(statePromise);
};
