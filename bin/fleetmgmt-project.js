#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const aws_vpc_msk_infra_stack_1 = require("../lib/aws-vpc-msk-infra-stack");
const config_1 = require("../config/config");
const aws_iot_core_provisioning_infra_stack_1 = require("../lib/aws-iot-core-provisioning-infra-stack");
const aws_iot_core_rule_infra_stack_1 = require("../lib/aws-iot-core-rule-infra-stack");
const app = new cdk.App();
new aws_iot_core_provisioning_infra_stack_1.AwsIotCoreProvisioningInfraStack(app, "AwsIotCoreProvisioningInfraStack", {
    env: {
        account: config_1.Config.aws.account,
        region: config_1.Config.aws.region,
    },
});
new aws_iot_core_rule_infra_stack_1.AwsIotCoreRuleInfraStack(app, "AwsIotCoreRuleInfraStack", {
    env: {
        account: config_1.Config.aws.account,
        region: config_1.Config.aws.region,
    },
});
new aws_vpc_msk_infra_stack_1.AwsVpcMskInfraStack(app, "AwsVpcMskInfraStack", {
    env: {
        account: config_1.Config.aws.account,
        region: config_1.Config.aws.region
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RrLXRlc3QtcHJvamVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNkay10ZXN0LXByb2plY3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBcUM7QUFDckMsaURBQW1DO0FBQ25DLDRFQUFtRTtBQUNuRSw2Q0FBMEM7QUFDMUMsd0dBQThGO0FBQzlGLHdGQUE4RTtBQUU5RSxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUUxQixJQUFJLHdFQUFnQyxDQUFDLEdBQUcsRUFBRSxrQ0FBa0MsRUFBRTtJQUMxRSxHQUFHLEVBQUU7UUFDRCxPQUFPLEVBQUUsZUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPO1FBQzNCLE1BQU0sRUFBRSxlQUFNLENBQUMsR0FBRyxDQUFDLE1BQU07S0FDNUI7Q0FDSixDQUFDLENBQUM7QUFFSCxJQUFJLHdEQUF3QixDQUFDLEdBQUcsRUFBRSwwQkFBMEIsRUFBRTtJQUMxRCxHQUFHLEVBQUU7UUFDRCxPQUFPLEVBQUUsZUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPO1FBQzNCLE1BQU0sRUFBRSxlQUFNLENBQUMsR0FBRyxDQUFDLE1BQU07S0FDNUI7Q0FDSixDQUFDLENBQUM7QUFHSCxJQUFJLDZDQUFtQixDQUFDLEdBQUcsRUFBRSxxQkFBcUIsRUFBRTtJQUNoRCxHQUFHLEVBQUU7UUFDRCxPQUFPLEVBQUUsZUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPO1FBQzNCLE1BQU0sRUFBRSxlQUFNLENBQUMsR0FBRyxDQUFDLE1BQU07S0FDNUI7Q0FDSixDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHtBd3NWcGNNc2tJbmZyYVN0YWNrfSBmcm9tIFwiLi4vbGliL2F3cy12cGMtbXNrLWluZnJhLXN0YWNrXCI7XG5pbXBvcnQgeyBDb25maWcgfSBmcm9tIFwiLi4vY29uZmlnL2NvbmZpZ1wiO1xuaW1wb3J0IHtBd3NJb3RDb3JlUHJvdmlzaW9uaW5nSW5mcmFTdGFja30gZnJvbSBcIi4uL2xpYi9hd3MtaW90LWNvcmUtcHJvdmlzaW9uaW5nLWluZnJhLXN0YWNrXCI7XG5pbXBvcnQge0F3c0lvdENvcmVSdWxlSW5mcmFTdGFja30gZnJvbSBcIi4uL2xpYi9hd3MtaW90LWNvcmUtcnVsZS1pbmZyYS1zdGFja1wiO1xuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuXG5uZXcgQXdzSW90Q29yZVByb3Zpc2lvbmluZ0luZnJhU3RhY2soYXBwLCBcIkF3c0lvdENvcmVQcm92aXNpb25pbmdJbmZyYVN0YWNrXCIsIHtcbiAgICBlbnY6IHtcbiAgICAgICAgYWNjb3VudDogQ29uZmlnLmF3cy5hY2NvdW50LFxuICAgICAgICByZWdpb246IENvbmZpZy5hd3MucmVnaW9uLFxuICAgIH0sXG59KTtcblxubmV3IEF3c0lvdENvcmVSdWxlSW5mcmFTdGFjayhhcHAsIFwiQXdzSW90Q29yZVJ1bGVJbmZyYVN0YWNrXCIsIHtcbiAgICBlbnY6IHtcbiAgICAgICAgYWNjb3VudDogQ29uZmlnLmF3cy5hY2NvdW50LFxuICAgICAgICByZWdpb246IENvbmZpZy5hd3MucmVnaW9uLFxuICAgIH0sXG59KTtcblxuXG5uZXcgQXdzVnBjTXNrSW5mcmFTdGFjayhhcHAsIFwiQXdzVnBjTXNrSW5mcmFTdGFja1wiLCB7XG4gICAgZW52OiB7XG4gICAgICAgIGFjY291bnQ6IENvbmZpZy5hd3MuYWNjb3VudCxcbiAgICAgICAgcmVnaW9uOiBDb25maWcuYXdzLnJlZ2lvblxuICAgIH1cbn0pIl19