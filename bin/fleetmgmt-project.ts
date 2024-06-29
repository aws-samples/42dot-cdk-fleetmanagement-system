#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {AwsVpcMskInfraStack} from "../lib/aws-vpc-msk-infra-stack";
import { Config } from "../config/config";
import {AwsIotCoreProvisioningInfraStack} from "../lib/aws-iot-core-provisioning-infra-stack";
import {AwsIotCoreRuleInfraStack} from "../lib/aws-iot-core-rule-infra-stack";

const app = new cdk.App();

new AwsIotCoreProvisioningInfraStack(app, "AwsIotCoreProvisioningInfraStack", {
    env: {
        account: Config.aws.account,
        region: Config.aws.region,
    },
});

new AwsIotCoreRuleInfraStack(app, "AwsIotCoreRuleInfraStack", {
    env: {
        account: Config.aws.account,
        region: Config.aws.region,
    },
});


new AwsVpcMskInfraStack(app, "AwsVpcMskInfraStack", {
    env: {
        account: Config.aws.account,
        region: Config.aws.region
    }
})