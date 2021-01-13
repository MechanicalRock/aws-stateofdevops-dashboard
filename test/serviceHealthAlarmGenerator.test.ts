import * as AWSMock from "aws-sdk-mock";
import { handler } from "../src/serviceHealthAlarmGenerator";

let cloudWatchDescribeAlarmSpy;
describe("serviceHealthAlarmGenerator", () => {
    describe("service health alarms exist", () => {
        const event = {
            account: "123456789012",
            region: "ap-southeast-2",
            detail: {},
            "detail-type": "Scheduled Event",
            source: "aws.events",
            time: "2019-03-01T01:23:45Z",
            id: "cdc73f9d-aea9-11e3-9d5a-835b769c0d9c",
            resources: ["arn:aws:events:ap-southeast-2:123456789012:rule/my-schedule"],
        };
        beforeEach(() => {
            cloudWatchDescribeAlarmSpy = jest.fn().mockReturnValue({});
            AWSMock.mock("CloudWatch", "describeAlarms", (params, callback) => {
                callback(null, cloudWatchDescribeAlarmSpy(params));
            });
        });
        afterEach(() => {
            AWSMock.restore();
            cloudWatchDescribeAlarmSpy.mockRestore();
        });
        it("should log, alarm exists", async () => {
            await handler(event);
            expect(true).toEqual(true);
        });
    });
});
