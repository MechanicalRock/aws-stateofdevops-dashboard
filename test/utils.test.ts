import * as AWSMock from "aws-sdk-mock";
import { SSM } from "aws-sdk";
import { getAppNamesFromSSM } from "../src/utils";

let SSMGetParameterSpy;
describe("Utils", () => {
    describe("SSM success result", () => {
        afterEach(() => {
            AWSMock.restore();
            SSMGetParameterSpy.mockRestore();
        });
        it("should return empty array when the ssm value is SDO defalut app name", async () => {
            SSMGetParameterSpy = jest.fn().mockReturnValue({
                Parameters: [
                    {
                        Name: "/state-of-devops/app-names",
                        Type: "StringList",
                        Value: "sdo-default-app-name",
                        Version: 3,
                        LastModifiedDate: "2021-01-14T00:27:16.013Z",
                        ARN: "arn:aws:ssm:ap-southeast-2:319524717526:parameter/state-of-devops/app-names",
                        DataType: "text",
                    },
                ],
                InvalidParameters: [],
            });
            AWSMock.mock("SSM", "getParameters", (params, callback) => {
                callback(null, SSMGetParameterSpy(params));
            });
            const ssm = new SSM();
            const result = await getAppNamesFromSSM(ssm);
            expect(result).toEqual([]);
            expect(SSMGetParameterSpy).toHaveBeenCalled();
        });
        it("should return an array of 3 items when the ssm value is 3 comma separated app names", async () => {
            SSMGetParameterSpy = jest.fn().mockReturnValue({
                Parameters: [
                    {
                        Name: "/state-of-devops/app-names",
                        Type: "StringList",
                        Value: "app1,app2,app3",
                        Version: 3,
                        LastModifiedDate: "2021-01-14T00:27:16.013Z",
                        ARN: "arn:aws:ssm:ap-southeast-2:319524717526:parameter/state-of-devops/app-names",
                        DataType: "text",
                    },
                ],
                InvalidParameters: [],
            });
            AWSMock.mock("SSM", "getParameters", (params, callback) => {
                callback(null, SSMGetParameterSpy(params));
            });
            const ssm = new SSM();
            const result = await getAppNamesFromSSM(ssm);
            expect(result).toEqual(["app1", "app2", "app3"]);
            expect(SSMGetParameterSpy).toHaveBeenCalled();
        });
    });

    describe("SSM failed result", () => {
        // beforeEach(() => {});
        afterEach(() => {
            AWSMock.restore();
            SSMGetParameterSpy.mockRestore();
        });
        it("should return empty array when the ssm value is empty", async () => {
            SSMGetParameterSpy = jest.fn().mockReturnValue({
                Parameters: [
                    {
                        Name: "/state-of-devops/app-names",
                        Type: "StringList",
                        Value: "",
                        Version: 3,
                        LastModifiedDate: "2021-01-14T00:27:16.013Z",
                        ARN: "arn:aws:ssm:ap-southeast-2:319524717526:parameter/state-of-devops/app-names",
                        DataType: "text",
                    },
                ],
                InvalidParameters: [],
            });
            AWSMock.mock("SSM", "getParameters", (params, callback) => {
                callback(null, SSMGetParameterSpy(params));
            });
            const ssm = new SSM();
            const result = await getAppNamesFromSSM(ssm);
            expect(result).toEqual([]);
            expect(SSMGetParameterSpy).toHaveBeenCalled();
        });
        it("should return empty array when the ssm returns an empty object", async () => {
            SSMGetParameterSpy = jest.fn().mockReturnValue({});
            AWSMock.mock("SSM", "getParameters", (params, callback) => {
                callback(null, SSMGetParameterSpy(params));
            });
            const ssm = new SSM();
            const result = await getAppNamesFromSSM(ssm);
            expect(result).toEqual([]);
            expect(SSMGetParameterSpy).toHaveBeenCalled();
        });

        it("should return empty array when the ssm returns null", async () => {
            SSMGetParameterSpy = jest.fn().mockReturnValue(null);
            AWSMock.mock("SSM", "getParameters", (params, callback) => {
                callback(null, SSMGetParameterSpy(params));
            });
            const ssm = new SSM();
            const result = await getAppNamesFromSSM(ssm);
            expect(result).toEqual([]);
            expect(SSMGetParameterSpy).toHaveBeenCalled();
        });

        it("should return empty array when the ssm returns undefined", async () => {
            SSMGetParameterSpy = jest.fn().mockReturnValue(undefined);
            AWSMock.mock("SSM", "getParameters", (params, callback) => {
                callback(null, SSMGetParameterSpy(params));
            });
            const ssm = new SSM();
            const result = await getAppNamesFromSSM(ssm);
            expect(result).toEqual([]);
            expect(SSMGetParameterSpy).toHaveBeenCalled();
        });
    });
});
