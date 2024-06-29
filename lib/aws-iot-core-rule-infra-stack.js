"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsIotCoreRuleInfraStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const rule_policy_json_1 = __importDefault(require("./rule/rule-policy.json"));
const config_1 = require("../config/config");
const rule_keys_json_1 = __importDefault(require("./rule/rule-keys.json"));
const key_policy_json_1 = __importDefault(require("./rule/key-policy.json"));
class AwsIotCoreRuleInfraStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Import VPC and Subnet
        // const vpc = ec2.Vpc.fromLookup(this, 'vpc', { isDefault: false, tags: { key: "Config.app.service" + "-" + Config.app.environment + "-vpc", value: Config.app.service + '-' + Config.app.environment}});
        const vpcId = aws_cdk_lib_1.Fn.importValue(config_1.Config.app.service + '-' + config_1.Config.app.environment + '-vpc-Id');
        const securityGroup = aws_cdk_lib_1.Fn.importValue(config_1.Config.app.service + '-' + config_1.Config.app.environment + '-securityGroup-Id');
        const subnet_private02a = aws_cdk_lib_1.Fn.importValue(config_1.Config.app.service + '-' + config_1.Config.app.environment + '-subnet-private02a');
        const subnet_private02b = aws_cdk_lib_1.Fn.importValue(config_1.Config.app.service + '-' + config_1.Config.app.environment + '-subnet-private02b');
        const mskCluster_bootstrap_brokers = aws_cdk_lib_1.Fn.importValue(config_1.Config.app.service + '-' + config_1.Config.app.environment + '-msk-' + config_1.Config.msk.clusterName + "-BootstrapBrokers");
        // For rules in IoT Core, please refer to this https://ap-northeast-2.console.aws.amazon.com/iot/home?region=ap-northeast-2#/rulehub
        // For role/policy for rules, please refer to https://docs.aws.amazon.com/iot/latest/developerguide/iot-create-role.html
        //  Create role for Rule engine
        let roleRuleEngine = new aws_cdk_lib_1.aws_iam.Role(this, config_1.Config.app.service + "-" + config_1.Config.app.environment + "-rule-engine-role", {
            assumedBy: new aws_cdk_lib_1.aws_iam.ServicePrincipal("iot.amazonaws.com"),
            description: "AWS I AM role for IoT rule engine",
            roleName: config_1.Config.app.service + "-" + config_1.Config.app.environment + "-rule-engine-role",
        });
        // Create policy for rule engine
        let iotCoreRolePolicy = aws_cdk_lib_1.aws_iam.PolicyDocument.fromJson(rule_policy_json_1.default);
        let ruleEnginePolicy = new aws_cdk_lib_1.aws_iam.Policy(this, config_1.Config.app.service +
            "-" +
            config_1.Config.app.environment +
            "-iot-core-role-policy", {
            document: iotCoreRolePolicy,
            policyName: "iotCoreRolePolicy",
        });
        ruleEnginePolicy.attachToRole(roleRuleEngine);
        //Create Topic Rule Destination for Kafka, replace security group, subnet, and VPC values with your own
        let cfnTopicRuleDestination = new aws_cdk_lib_1.aws_iot.CfnTopicRuleDestination(this, "MyCfnTopicRuleDestination", 
        /* all optional props */ {
            vpcProperties: {
                roleArn: roleRuleEngine.roleArn,
                securityGroups: [securityGroup],
                subnetIds: [subnet_private02a, subnet_private02b],
                vpcId: vpcId,
            },
        });
        //CDK Unable to infer the rule destination requires IAM policies. Manually adding dependency
        cfnTopicRuleDestination.node.addDependency(ruleEnginePolicy);
        //Create KMS key for secret encryption
        key_policy_json_1.default.Statement[0].Principal.AWS = "arn:aws:iam::" + config_1.Config.aws.account + ":root";
        const key = new aws_cdk_lib_1.aws_kms.CfnKey(this, "Key", {
            enabled: true,
            enableKeyRotation: false,
            keyPolicy: key_policy_json_1.default,
            keySpec: "SYMMETRIC_DEFAULT",
            keyUsage: "ENCRYPT_DECRYPT",
        });
        new aws_cdk_lib_1.aws_kms.CfnAlias(this, "KeyAlias", {
            aliasName: "alias/" + config_1.Config.app.application + "-" + config_1.Config.app.environment + "-msk", targetKeyId: key.ref
        });
        //Create AWS Secrets Manager Password for MSK connection
        const iotSecret = new aws_cdk_lib_1.aws_secretsmanager.CfnSecret(this, "IoTSecret", {
            name: "AmazonMSK_" + config_1.Config.app.application + "-" + config_1.Config.app.environment,
            kmsKeyId: key.ref,
            generateSecretString: {
                passwordLength: 20,
                excludeCharacters: "]/'",
                generateStringKey: "password",
                secretStringTemplate: JSON.stringify({ username: "test-kafka" }),
            },
        });
        // Get rules from ruleKeysJson
        let testRuleKeys = rule_keys_json_1.default.testRules;
        // Create Rules in IoT Core to send to S3 and MSK
        testRuleKeys.forEach((key) => {
            new aws_cdk_lib_1.aws_iot.CfnTopicRule(this, config_1.Config.app.service + "-" + config_1.Config.app.environment + `-topic-rule-${key}`, {
                topicRulePayload: {
                    actions: [
                        {
                            kafka: {
                                clientProperties: {
                                    acks: "1",
                                    //Replace placeholder Kafka bootstrap Servers with your own
                                    "bootstrap.servers": mskCluster_bootstrap_brokers,
                                    "security.protocol": "SASL_SSL",
                                    "sasl.mechanism": "SCRAM-SHA-512",
                                    "sasl.scram.username": "${get_secret('AmazonMSK_iot','SecretString','username'," +
                                        `'${roleRuleEngine.roleArn}')}`,
                                    "sasl.scram.password": "${get_secret('AmazonMSK_iot','SecretString','password'," +
                                        `'${roleRuleEngine.roleArn}')}`,
                                },
                                destinationArn: cfnTopicRuleDestination.attrArn,
                                topic: `test-msk-topic.${key}`
                            },
                        },
                    ],
                    sql: `SELECT * FROM 'test-rule/${key}'`,
                },
                // iot does not allow rule '-' (dash).
                ruleName: `test_rule_${key}`,
            });
        });
    }
}
exports.AwsIotCoreRuleInfraStack = AwsIotCoreRuleInfraStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXdzLWlvdC1jb3JlLXJ1bGUtaW5mcmEtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhd3MtaW90LWNvcmUtcnVsZS1pbmZyYS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSw2Q0FTcUI7QUFFckIsK0VBQXFEO0FBQ3JELDZDQUEwQztBQUMxQywyRUFBaUQ7QUFDakQsNkVBQW1EO0FBR25ELE1BQWEsd0JBQXlCLFNBQVEsbUJBQUs7SUFDL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFrQjtRQUN4RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qix3QkFBd0I7UUFDeEIsME1BQTBNO1FBQzFNLE1BQU0sS0FBSyxHQUFHLGdCQUFFLENBQUMsV0FBVyxDQUFDLGVBQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxlQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUMsQ0FBQztRQUM1RixNQUFNLGFBQWEsR0FBRyxnQkFBRSxDQUFDLFdBQVcsQ0FBQyxlQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxHQUFHLEdBQUcsZUFBTSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsbUJBQW1CLENBQUMsQ0FBQztRQUU5RyxNQUFNLGlCQUFpQixHQUFHLGdCQUFFLENBQUMsV0FBVyxDQUFDLGVBQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxlQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ25ILE1BQU0saUJBQWlCLEdBQUcsZ0JBQUUsQ0FBQyxXQUFXLENBQUMsZUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxHQUFHLGVBQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLG9CQUFvQixDQUFDLENBQUM7UUFFbkgsTUFBTSw0QkFBNEIsR0FBRyxnQkFB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QkFDSjtxQkFDSjtvQkFDRCxHQUFHLEVBQUUsNEJBQTRCLEdBQUcsR0FBRztpQkFDMUM7Z0JBQ0Qsc0NBQXNDO2dCQUN0QyxRQUFRLEVBQUUsYUFBYSxHQUFHLEVBQUU7YUFDL0IsQ0FDSixDQUFDO1FBQ04sQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0NBQ0o7QUEvSEQsNERBK0hDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgICBTdGFjayxcbiAgICBTdGFja1Byb3BzLFxuICAgIGF3c19pb3QgYXMgaW90LFxuICAgIGF3c19pYW0gYXMgaWFtLFxuICAgIGF3c19zZWNyZXRzbWFuYWdlciBhcyBzZWNyZXRzbWFuYWdlcixcbiAgICBhd3Nfa21zIGFzIGttcyxcbiAgICBhd3NfZWMyIGFzIGVjMixcbiAgICBGbixcbn0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHJ1bGVQb2xpY3lKc29uIGZyb20gXCIuL3J1bGUvcnVsZS1wb2xpY3kuanNvblwiO1xuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4uL2NvbmZpZy9jb25maWdcIjtcbmltcG9ydCBydWxlS2V5c0pzb24gZnJvbSBcIi4vcnVsZS9ydWxlLWtleXMuanNvblwiO1xuaW1wb3J0IGtleVBvbGljeUpzb24gZnJvbSBcIi4vcnVsZS9rZXktcG9saWN5Lmpzb25cIjtcblxuXG5leHBvcnQgY2xhc3MgQXdzSW90Q29yZVJ1bGVJbmZyYVN0YWNrIGV4dGVuZHMgU3RhY2sge1xuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogU3RhY2tQcm9wcykge1xuICAgICAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgICAgICAvLyBJbXBvcnQgVlBDIGFuZCBTdWJuZXRcbiAgICAgICAgLy8gY29uc3QgdnBjID0gZWMyLlZwYy5mcm9tTG9va3VwKHRoaXMsICd2cGMnLCB7IGlzRGVmYXVsdDogZmFsc2UsIHRhZ3M6IHsga2V5OiBcIkNvbmZpZy5hcHAuc2VydmljZVwiICsgXCItXCIgKyBDb25maWcuYXBwLmVudmlyb25tZW50ICsgXCItdnBjXCIsIHZhbHVlOiBDb25maWcuYXBwLnNlcnZpY2UgKyAnLScgKyBDb25maWcuYXBwLmVudmlyb25tZW50fX0pO1xuICAgICAgICBjb25zdCB2cGNJZCA9IEZuLmltcG9ydFZhbHVlKENvbmZpZy5hcHAuc2VydmljZSArICctJyArIENvbmZpZy5hcHAuZW52aXJvbm1lbnQgKyAnLXZwYy1JZCcpO1xuICAgICAgICBjb25zdCBzZWN1cml0eUdyb3VwID0gRm4uaW1wb3J0VmFsdWUoQ29uZmlnLmFwcC5zZXJ2aWNlICsgJy0nICsgQ29uZmlnLmFwcC5lbnZpcm9ubWVudCArICctc2VjdXJpdHlHcm91cC1JZCcpO1xuXG4gICAgICAgIGNvbnN0IHN1Ym5ldF9wcml2YXRlMDJhID0gRm4uaW1wb3J0VmFsdWUoQ29uZmlnLmFwcC5zZXJ2aWNlICsgJy0nICsgQ29uZmlnLmFwcC5lbnZpcm9ubWVudCArICctc3VibmV0LXByaXZhdGUwMmEnKTtcbiAgICAgICAgY29uc3Qgc3VibmV0X3ByaXZhdGUwMmIgPSBGbi5pbXBvcnRWYWx1ZShDb25maWcuYXBwLnNlcnZpY2UgKyAnLScgKyBDb25maWcuYXBwLmVudmlyb25tZW50ICsgJy1zdWJuZXQtcHJpdmF0ZTAyYicpO1xuXG4gICAgICAgIGNvbnN0IG1za0NsdXN0ZXJfYm9vdHN0cmFwX2Jyb2tlcnMgPSBGbi5pbXBvcnRWYWx1ZShDb25maWcuYXBwLnNlcnZpY2UgKyAnLScgKyBDb25maWcuYXBwLmVudmlyb25tZW50ICsgJy1tc2stJyArIENvbmZpZy5tc2suY2x1c3Rlck5hbWUgKyBcIi1Cb290c3RyYXBCcm9rZXJzXCIpO1xuXG4gICAgICAgIC8vIEZvciBydWxlcyBpbiBJb1QgQ29yZSwgcGxlYXNlIHJlZmVyIHRvIHRoaXMgaHR0cHM6Ly9hcC1ub3J0aGVhc3QtMi5jb25zb2xlLmF3cy5hbWF6b24uY29tL2lvdC9ob21lP3JlZ2lvbj1hcC1ub3J0aGVhc3QtMiMvcnVsZWh1YlxuICAgICAgICAvLyBGb3Igcm9sZS9wb2xpY3kgZm9yIHJ1bGVzLCBwbGVhc2UgcmVmZXIgdG8gaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL2lvdC9sYXRlc3QvZGV2ZWxvcGVyZ3VpZGUvaW90LWNyZWF0ZS1yb2xlLmh0bWxcblxuICAgICAgICAvLyAgQ3JlYXRlIHJvbGUgZm9yIFJ1bGUgZW5naW5lXG4gICAgICAgIGxldCByb2xlUnVsZUVuZ2luZSA9IG5ldyBpYW0uUm9sZShcbiAgICAgICAgICAgIHRoaXMsIENvbmZpZy5hcHAuc2VydmljZSArIFwiLVwiICsgQ29uZmlnLmFwcC5lbnZpcm9ubWVudCArIFwiLXJ1bGUtZW5naW5lLXJvbGVcIiwge1xuICAgICAgICAgICAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKFwiaW90LmFtYXpvbmF3cy5jb21cIiksXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiQVdTIEkgQU0gcm9sZSBmb3IgSW9UIHJ1bGUgZW5naW5lXCIsXG4gICAgICAgICAgICAgICAgcm9sZU5hbWU6IENvbmZpZy5hcHAuc2VydmljZSArIFwiLVwiICsgQ29uZmlnLmFwcC5lbnZpcm9ubWVudCArIFwiLXJ1bGUtZW5naW5lLXJvbGVcIixcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAvLyBDcmVhdGUgcG9saWN5IGZvciBydWxlIGVuZ2luZVxuICAgICAgICBsZXQgaW90Q29yZVJvbGVQb2xpY3kgPSBpYW0uUG9saWN5RG9jdW1lbnQuZnJvbUpzb24ocnVsZVBvbGljeUpzb24pO1xuXG4gICAgICAgIGxldCBydWxlRW5naW5lUG9saWN5ID0gbmV3IGlhbS5Qb2xpY3koXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgQ29uZmlnLmFwcC5zZXJ2aWNlICtcbiAgICAgICAgICAgIFwiLVwiICtcbiAgICAgICAgICAgIENvbmZpZy5hcHAuZW52aXJvbm1lbnQgK1xuICAgICAgICAgICAgXCItaW90LWNvcmUtcm9sZS1wb2xpY3lcIixcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudDogaW90Q29yZVJvbGVQb2xpY3ksXG4gICAgICAgICAgICAgICAgcG9saWN5TmFtZTogXCJpb3RDb3JlUm9sZVBvbGljeVwiLFxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIHJ1bGVFbmdpbmVQb2xpY3kuYXR0YWNoVG9Sb2xlKHJvbGVSdWxlRW5naW5lKVxuXG4gICAgICAgIC8vQ3JlYXRlIFRvcGljIFJ1bGUgRGVzdGluYXRpb24gZm9yIEthZmthLCByZXBsYWNlIHNlY3VyaXR5IGdyb3VwLCBzdWJuZXQsIGFuZCBWUEMgdmFsdWVzIHdpdGggeW91ciBvd25cbiAgICAgICAgbGV0IGNmblRvcGljUnVsZURlc3RpbmF0aW9uID0gbmV3IGlvdC5DZm5Ub3BpY1J1bGVEZXN0aW5hdGlvbihcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBcIk15Q2ZuVG9waWNSdWxlRGVzdGluYXRpb25cIixcbiAgICAgICAgICAgIC8qIGFsbCBvcHRpb25hbCBwcm9wcyAqLyB7XG4gICAgICAgICAgICAgICAgdnBjUHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICByb2xlQXJuOiByb2xlUnVsZUVuZ2luZS5yb2xlQXJuLFxuICAgICAgICAgICAgICAgICAgICBzZWN1cml0eUdyb3VwczogW3NlY3VyaXR5R3JvdXBdLFxuICAgICAgICAgICAgICAgICAgICBzdWJuZXRJZHM6IFtzdWJuZXRfcHJpdmF0ZTAyYSwgc3VibmV0X3ByaXZhdGUwMmJdLFxuICAgICAgICAgICAgICAgICAgICB2cGNJZDogdnBjSWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAvL0NESyBVbmFibGUgdG8gaW5mZXIgdGhlIHJ1bGUgZGVzdGluYXRpb24gcmVxdWlyZXMgSUFNIHBvbGljaWVzLiBNYW51YWxseSBhZGRpbmcgZGVwZW5kZW5jeVxuICAgICAgICBjZm5Ub3BpY1J1bGVEZXN0aW5hdGlvbi5ub2RlLmFkZERlcGVuZGVuY3kocnVsZUVuZ2luZVBvbGljeSlcblxuXG4gICAgICAgIC8vQ3JlYXRlIEtNUyBrZXkgZm9yIHNlY3JldCBlbmNyeXB0aW9uXG4gICAgICAgIGtleVBvbGljeUpzb24uU3RhdGVtZW50WzBdLlByaW5jaXBhbC5BV1MgPSBcImFybjphd3M6aWFtOjpcIiArIENvbmZpZy5hd3MuYWNjb3VudCArIFwiOnJvb3RcIlxuXG4gICAgICAgIGNvbnN0IGtleSA9IG5ldyBrbXMuQ2ZuS2V5KHRoaXMsIFwiS2V5XCIsIHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBlbmFibGVLZXlSb3RhdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBrZXlQb2xpY3k6IGtleVBvbGljeUpzb24sXG4gICAgICAgICAgICBrZXlTcGVjOiBcIlNZTU1FVFJJQ19ERUZBVUxUXCIsXG4gICAgICAgICAgICBrZXlVc2FnZTogXCJFTkNSWVBUX0RFQ1JZUFRcIixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IGttcy5DZm5BbGlhcyh0aGlzLCBcIktleUFsaWFzXCIsIHtcbiAgICAgICAgICAgIGFsaWFzTmFtZTogXCJhbGlhcy9cIiArIENvbmZpZy5hcHAuYXBwbGljYXRpb24gKyBcIi1cIiArIENvbmZpZy5hcHAuZW52aXJvbm1lbnQgKyBcIi1tc2tcIiwgdGFyZ2V0S2V5SWQ6IGtleS5yZWZcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy9DcmVhdGUgQVdTIFNlY3JldHMgTWFuYWdlciBQYXNzd29yZCBmb3IgTVNLIGNvbm5lY3Rpb25cbiAgICAgICAgY29uc3QgaW90U2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLkNmblNlY3JldCh0aGlzLCBcIklvVFNlY3JldFwiLCB7XG4gICAgICAgICAgICBuYW1lOlxuICAgICAgICAgICAgICAgIFwiQW1hem9uTVNLX1wiICsgQ29uZmlnLmFwcC5hcHBsaWNhdGlvbiArIFwiLVwiICsgQ29uZmlnLmFwcC5lbnZpcm9ubWVudCxcbiAgICAgICAgICAgIGttc0tleUlkOiBrZXkucmVmLFxuICAgICAgICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcbiAgICAgICAgICAgICAgICBwYXNzd29yZExlbmd0aDogMjAsXG4gICAgICAgICAgICAgICAgZXhjbHVkZUNoYXJhY3RlcnM6IFwiXS8nXCIsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6IFwicGFzc3dvcmRcIixcbiAgICAgICAgICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogSlNPTi5zdHJpbmdpZnkoe3VzZXJuYW1lOiBcInRlc3Qta2Fma2FcIn0pLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gR2V0IHJ1bGVzIGZyb20gcnVsZUtleXNKc29uXG4gICAgICAgIGxldCB0ZXN0UnVsZUtleXMgPSBydWxlS2V5c0pzb24udGVzdFJ1bGVzO1xuXG4gICAgICAgIC8vIENyZWF0ZSBSdWxlcyBpbiBJb1QgQ29yZSB0byBzZW5kIHRvIFMzIGFuZCBNU0tcbiAgICAgICAgdGVzdFJ1bGVLZXlzLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgICAgICAgbmV3IGlvdC5DZm5Ub3BpY1J1bGUoXG4gICAgICAgICAgICAgICAgdGhpcywgQ29uZmlnLmFwcC5zZXJ2aWNlICsgXCItXCIgKyBDb25maWcuYXBwLmVudmlyb25tZW50ICsgYC10b3BpYy1ydWxlLSR7a2V5fWAsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0b3BpY1J1bGVQYXlsb2FkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrYWZrYToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpZW50UHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFja3M6IFwiMVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vUmVwbGFjZSBwbGFjZWhvbGRlciBLYWZrYSBib290c3RyYXAgU2VydmVycyB3aXRoIHlvdXIgb3duXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJib290c3RyYXAuc2VydmVyc1wiOiBtc2tDbHVzdGVyX2Jvb3RzdHJhcF9icm9rZXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwic2VjdXJpdHkucHJvdG9jb2xcIjogXCJTQVNMX1NTTFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwic2FzbC5tZWNoYW5pc21cIjogXCJTQ1JBTS1TSEEtNTEyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzYXNsLnNjcmFtLnVzZXJuYW1lXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiJHtnZXRfc2VjcmV0KCdBbWF6b25NU0tfaW90JywnU2VjcmV0U3RyaW5nJywndXNlcm5hbWUnLFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYCcke3JvbGVSdWxlRW5naW5lLnJvbGVBcm59Jyl9YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInNhc2wuc2NyYW0ucGFzc3dvcmRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCIke2dldF9zZWNyZXQoJ0FtYXpvbk1TS19pb3QnLCdTZWNyZXRTdHJpbmcnLCdwYXNzd29yZCcsXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgJyR7cm9sZVJ1bGVFbmdpbmUucm9sZUFybn0nKX1gLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc3RpbmF0aW9uQXJuOiBjZm5Ub3BpY1J1bGVEZXN0aW5hdGlvbi5hdHRyQXJuLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9waWM6IGB0ZXN0LW1zay10b3BpYy4ke2tleX1gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzcWw6IGBTRUxFQ1QgKiBGUk9NICd0ZXN0LXJ1bGUvJHtrZXl9J2AsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIC8vIGlvdCBkb2VzIG5vdCBhbGxvdyBydWxlICctJyAoZGFzaCkuXG4gICAgICAgICAgICAgICAgICAgIHJ1bGVOYW1lOiBgdGVzdF9ydWxlXyR7a2V5fWAsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuIl19