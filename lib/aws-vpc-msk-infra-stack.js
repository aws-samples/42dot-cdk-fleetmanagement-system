"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsVpcMskInfraStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const config_1 = require("../config/config");
const custom_resources_1 = require("aws-cdk-lib/custom-resources");
// import * as sqs from 'aws-cdk-lib/aws-sqs';
class AwsVpcMskInfraStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create vpc
        this.vpc = new aws_cdk_lib_1.aws_ec2.CfnVPC(// TODO: 무엇을 위한 vpc 인지 확인하기
        this, "vpc", {
            cidrBlock: config_1.Config.vpc.cidr + '.0.0/16',
            enableDnsHostnames: true,
            enableDnsSupport: true,
            instanceTenancy: 'default',
            tags: [{ key: "Config.app.service" + "-" + config_1.Config.app.environment + "-vpc", value: config_1.Config.app.service + '-' + config_1.Config.app.environment }]
        });
        new aws_cdk_lib_1.CfnOutput(this, 'vpcId', {
            exportName: config_1.Config.app.service + '-' + config_1.Config.app.environment + '-vpc-Id',
            value: this.vpc.ref,
        });
        // Create two private subnets
        const subnet_private_01_a = this.subnet_creation('private01a', '.96.0/20');
        const subnet_private_01_c = this.subnet_creation('private01c', '.112.0/20');
        // Create Security Group
        let securityGroup = new aws_cdk_lib_1.aws_ec2.CfnSecurityGroup(// TODO: 무엇을 위한 vpc 인지 확인하기
        this, config_1.Config.app.service + "-" + config_1.Config.app.environment + "-msk-security-group", {
            vpcId: this.vpc.ref,
            groupDescription: config_1.Config.app.service + '-' + config_1.Config.app.environment + '-msk-' + config_1.Config.msk.clusterName,
            groupName: config_1.Config.app.service + '-' + config_1.Config.app.environment + '-msk-' + config_1.Config.msk.clusterName,
            securityGroupIngress: [{
                    ipProtocol: "TCP",
                    fromPort: 2181,
                    toPort: 2181,
                    cidrIp: config_1.Config.security_group[0],
                    description: config_1.Config.security_group[0]
                }],
            // tags: [{ key: 'Name', value: Config.app.service + '-' + Config.app.environment + '-msk-' + Config.msk.clusterName, }],
        });
        new aws_cdk_lib_1.CfnOutput(this, 'securityGroup', {
            exportName: config_1.Config.app.service + '-' + config_1.Config.app.environment + '-securityGroup-Id',
            value: securityGroup.attrGroupId,
        });
        // Create MSK cluster
        let mskCluster = new aws_cdk_lib_1.aws_msk.CfnCluster(this, config_1.Config.app.service + "-" + config_1.Config.app.environment + "-msk-cluster", {
            brokerNodeGroupInfo: {
                clientSubnets: [subnet_private_01_a.ref, subnet_private_01_c.ref],
                instanceType: 'kafka.t3.small',
                securityGroups: [securityGroup.ref],
                // the properties below are optional
                storageInfo: { ebsStorageInfo: { volumeSize: 1 } }
            },
            clusterName: config_1.Config.app.service + '-' + config_1.Config.app.environment + '-msk-' + config_1.Config.msk.clusterName,
            kafkaVersion: '2.8.1',
            numberOfBrokerNodes: 2,
            // the properties below are optional
            clientAuthentication: { sasl: { scram: { enabled: true, }, }, }
        });
        // TODO: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-kafka/classes/getbootstrapbrokerscommand.html
        let getBootStrapBrokers = new custom_resources_1.AwsCustomResource(this, config_1.Config.app.service + "-" + config_1.Config.app.environment + "-get-bootstrap-servers", {
            onUpdate: {
                service: "client-msk",
                action: "GetBootstrapBrokers",
                parameters: { ClusterArn: mskCluster.attrArn },
                physicalResourceId: custom_resources_1.PhysicalResourceId.of(mskCluster.attrArn),
            },
            policy: custom_resources_1.AwsCustomResourcePolicy.fromSdkCalls({ resources: custom_resources_1.AwsCustomResourcePolicy.ANY_RESOURCE }),
            //TODO: 안될 경우 ChatGPT의 조언대로  변경 가능
            // policy: AwsCustomResourcePolicy.fromStatements([
            //     new iam.PolicyStatement({
            //         actions: ['msk:GetBootstrapBrokers'],
            //         resources: ['*'],
            //     }),
            // ]),
        });
        const bootstrapBrokerString = getBootStrapBrokers.getResponseField("BootstrapBrokerString");
        console.log("bootstrapBrokerString: " + bootstrapBrokerString);
        // Use AWS SDK to fetch bootstrap brokers
        new aws_cdk_lib_1.CfnOutput(this, 'mskCluster', {
            exportName: config_1.Config.app.service + '-' + config_1.Config.app.environment + '-msk-' + config_1.Config.msk.clusterName + "-BootstrapBrokers",
            value: bootstrapBrokerString,
        });
    }
    subnet_creation(subnet_name, subnet_cidr) {
        const subnet_group = subnet_name.slice(0, -1);
        const az = subnet_name.slice(-1);
        const subnet = new aws_cdk_lib_1.aws_ec2.CfnSubnet(this, 'subnet' + subnet_name, {
            availabilityZone: this.region + az,
            cidrBlock: config_1.Config.vpc.cidr + subnet_cidr,
            vpcId: this.vpc.ref,
            tags: [{ key: 'Name', value: config_1.Config.app.service + '-' + config_1.Config.app.environment + '-' + subnet_group + '-' + az }]
        });
        new aws_cdk_lib_1.CfnOutput(this, 'subnet' + subnet_name + 'output', {
            exportName: config_1.Config.app.service + '-' + config_1.Config.app.environment + '-subnet-' + subnet_name,
            value: subnet.ref
        });
        return subnet;
    }
}
exports.AwsVpcMskInfraStack = AwsVpcMskInfraStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXdzLXZwYy1tc2staW5mcmEtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhd3MtdnBjLW1zay1pbmZyYS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FNcUI7QUFFckIsNkNBQXdDO0FBQ3hDLG1FQUE0RztBQUU1Ryw4Q0FBOEM7QUFFOUMsTUFBYSxtQkFBb0IsU0FBUSxtQkFBSztJQUUxQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQ3hELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLGFBQWE7UUFDYixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUkscUJBQUcsQ0FBQyxNQUFNLENBQUUsMkJBQTJCO1FBQ2xELElBQUksRUFBRSxLQUFLLEVBQUU7WUFDVCxTQUFTLEVBQUUsZUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsU0FBUztZQUN0QyxrQkFBa0IsRUFBRSxJQUFJO1lBQ3hCLGdCQUFnQixFQUFFLElBQUk7WUFDdEIsZUFBZSxFQUFFLFNBQVM7WUFDMUIsSUFBSSxFQUFFLENBQUUsRUFBRSxHQUFHLEVBQUUsb0JBQW9CLEdBQUcsR0FBRyxHQUFHLGVBQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLE1BQU0sRUFBRSxLQUFLLEVBQUUsZUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxHQUFHLGVBQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFDLENBQUU7U0FDM0ksQ0FBQyxDQUFDO1FBRVAsSUFBSSx1QkFBUyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUU7WUFDekIsVUFBVSxFQUFFLGVBQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxlQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxTQUFTO1lBQ3pFLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUc7U0FDdEIsQ0FBQyxDQUFB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QU0sR0FBRyxJQUFJLHFCQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxRQUFRLEdBQUcsV0FBVyxFQUFFO1lBQzNELGdCQUFnQixFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRTtZQUNsQyxTQUFTLEVBQUUsZUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsV0FBVztZQUN4QyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHO1lBQ25CLElBQUksRUFBRSxDQUFDLEVBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsZUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxHQUFHLGVBQU0sQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLEdBQUcsR0FBRyxZQUFZLEdBQUcsR0FBRyxHQUFHLEVBQUUsRUFBQyxDQUFDO1NBQ2xILENBQUMsQ0FBQztRQUVILElBQUksdUJBQVMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxHQUFHLFdBQVcsR0FBRyxRQUFRLEVBQUU7WUFDbkQsVUFBVSxFQUFFLGVBQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxlQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsR0FBRyxVQUFVLEdBQUcsV0FBVztZQUN4RixLQUFLLEVBQUUsTUFBTSxDQUFDLEdBQUc7U0FDcEIsQ0FBQyxDQUFBO1FBRUYsT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQztDQUNKO0FBakhELGtEQWlIQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gICAgU3RhY2ssXG4gICAgU3RhY2tQcm9wcyxcbiAgICBhd3NfZWMyIGFzIGVjMixcbiAgICBhd3NfbXNrIGFzIG1zayxcbiAgICBDZm5PdXRwdXQsXG59IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7Q29uZmlnfSBmcm9tIFwiLi4vY29uZmlnL2NvbmZpZ1wiO1xuaW1wb3J0IHtBd3NDdXN0b21SZXNvdXJjZSwgQXdzQ3VzdG9tUmVzb3VyY2VQb2xpY3ksIFBoeXNpY2FsUmVzb3VyY2VJZH0gZnJvbSBcImF3cy1jZGstbGliL2N1c3RvbS1yZXNvdXJjZXNcIjtcblxuLy8gaW1wb3J0ICogYXMgc3FzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zcXMnO1xuXG5leHBvcnQgY2xhc3MgQXdzVnBjTXNrSW5mcmFTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgICB2cGM6IGVjMi5DZm5WUEM7XG4gICAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB2cGNcbiAgICAgICAgdGhpcy52cGMgPSBuZXcgZWMyLkNmblZQQyggLy8gVE9ETzog66y07JeH7J2EIOychO2VnCB2cGMg7J247KeAIO2ZleyduO2VmOq4sFxuICAgICAgICAgICAgdGhpcywgXCJ2cGNcIiwge1xuICAgICAgICAgICAgICAgIGNpZHJCbG9jazogQ29uZmlnLnZwYy5jaWRyICsgJy4wLjAvMTYnLFxuICAgICAgICAgICAgICAgIGVuYWJsZURuc0hvc3RuYW1lczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBlbmFibGVEbnNTdXBwb3J0OiB0cnVlLFxuICAgICAgICAgICAgICAgIGluc3RhbmNlVGVuYW5jeTogJ2RlZmF1bHQnLFxuICAgICAgICAgICAgICAgIHRhZ3M6IFsgeyBrZXk6IFwiQ29uZmlnLmFwcC5zZXJ2aWNlXCIgKyBcIi1cIiArIENvbmZpZy5hcHAuZW52aXJvbm1lbnQgKyBcIi12cGNcIiwgdmFsdWU6IENvbmZpZy5hcHAuc2VydmljZSArICctJyArIENvbmZpZy5hcHAuZW52aXJvbm1lbnR9IF1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIG5ldyBDZm5PdXRwdXQodGhpcywgJ3ZwY0lkJywge1xuICAgICAgICAgICAgZXhwb3J0TmFtZTogQ29uZmlnLmFwcC5zZXJ2aWNlICsgJy0nICsgQ29uZmlnLmFwcC5lbnZpcm9ubWVudCArICctdnBjLUlkJyxcbiAgICAgICAgICAgIHZhbHVlOiB0aGlzLnZwYy5yZWYsXG4gICAgICAgIH0pXG5cblxuICAgICAgICAvLyBDcmVhdGUgdHdvIHByaXZhdGUgc3VibmV0c1xuICAgICAgICBjb25zdCBzdWJuZXRfcHJpdmF0ZV8wMV9hOiBlYzIuQ2ZuU3VibmV0ID0gdGhpcy5zdWJuZXRfY3JlYXRpb24oJ3ByaXZhdGUwMWEnLCAnLjk2LjAvMjAnKTtcbiAgICAgICAgY29uc3Qgc3VibmV0X3ByaXZhdGVfMDFfYzogZWMyLkNmblN1Ym5ldCA9IHRoaXMuc3VibmV0X2NyZWF0aW9uKCdwcml2YXRlMDFjJywgJy4xMTIuMC8yMCcpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBTZWN1cml0eSBHcm91cFxuICAgICAgICBsZXQgc2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuQ2ZuU2VjdXJpdHlHcm91cCggLy8gVE9ETzog66y07JeH7J2EIOychO2VnCB2cGMg7J247KeAIO2ZleyduO2VmOq4sFxuICAgICAgICAgICAgdGhpcywgQ29uZmlnLmFwcC5zZXJ2aWNlICsgXCItXCIgKyBDb25maWcuYXBwLmVudmlyb25tZW50ICsgXCItbXNrLXNlY3VyaXR5LWdyb3VwXCIsIHtcbiAgICAgICAgICAgICAgICB2cGNJZDogdGhpcy52cGMucmVmLFxuICAgICAgICAgICAgICAgIGdyb3VwRGVzY3JpcHRpb246IENvbmZpZy5hcHAuc2VydmljZSArICctJyArIENvbmZpZy5hcHAuZW52aXJvbm1lbnQgKyAnLW1zay0nICsgQ29uZmlnLm1zay5jbHVzdGVyTmFtZSxcbiAgICAgICAgICAgICAgICBncm91cE5hbWU6IENvbmZpZy5hcHAuc2VydmljZSArICctJyArIENvbmZpZy5hcHAuZW52aXJvbm1lbnQgKyAnLW1zay0nICsgQ29uZmlnLm1zay5jbHVzdGVyTmFtZSxcbiAgICAgICAgICAgICAgICBzZWN1cml0eUdyb3VwSW5ncmVzczogW3tcbiAgICAgICAgICAgICAgICAgICAgaXBQcm90b2NvbDogXCJUQ1BcIixcbiAgICAgICAgICAgICAgICAgICAgZnJvbVBvcnQ6IDIxODEsXG4gICAgICAgICAgICAgICAgICAgIHRvUG9ydDogMjE4MSxcbiAgICAgICAgICAgICAgICAgICAgY2lkcklwOiBDb25maWcuc2VjdXJpdHlfZ3JvdXBbMF0sXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBDb25maWcuc2VjdXJpdHlfZ3JvdXBbMF1cbiAgICAgICAgICAgICAgICB9XSxcbiAgICAgICAgICAgICAgICAvLyB0YWdzOiBbeyBrZXk6ICdOYW1lJywgdmFsdWU6IENvbmZpZy5hcHAuc2VydmljZSArICctJyArIENvbmZpZy5hcHAuZW52aXJvbm1lbnQgKyAnLW1zay0nICsgQ29uZmlnLm1zay5jbHVzdGVyTmFtZSwgfV0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsICdzZWN1cml0eUdyb3VwJywge1xuICAgICAgICAgICAgZXhwb3J0TmFtZTogQ29uZmlnLmFwcC5zZXJ2aWNlICsgJy0nICsgQ29uZmlnLmFwcC5lbnZpcm9ubWVudCArICctc2VjdXJpdHlHcm91cC1JZCcsXG4gICAgICAgICAgICB2YWx1ZTogc2VjdXJpdHlHcm91cC5hdHRyR3JvdXBJZCxcbiAgICAgICAgfSlcblxuICAgICAgICAvLyBDcmVhdGUgTVNLIGNsdXN0ZXJcbiAgICAgICAgbGV0IG1za0NsdXN0ZXIgPSBuZXcgbXNrLkNmbkNsdXN0ZXIoXG4gICAgICAgICAgICB0aGlzLCBDb25maWcuYXBwLnNlcnZpY2UgKyBcIi1cIiArIENvbmZpZy5hcHAuZW52aXJvbm1lbnQgKyBcIi1tc2stY2x1c3RlclwiLCB7XG4gICAgICAgICAgICAgICAgYnJva2VyTm9kZUdyb3VwSW5mbzoge1xuICAgICAgICAgICAgICAgICAgICBjbGllbnRTdWJuZXRzOiBbc3VibmV0X3ByaXZhdGVfMDFfYS5yZWYsIHN1Ym5ldF9wcml2YXRlXzAxX2MucmVmXSxcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2VUeXBlOiAna2Fma2EudDMuc21hbGwnLFxuICAgICAgICAgICAgICAgICAgICBzZWN1cml0eUdyb3VwczogW3NlY3VyaXR5R3JvdXAucmVmXSxcbiAgICAgICAgICAgICAgICAgICAgLy8gdGhlIHByb3BlcnRpZXMgYmVsb3cgYXJlIG9wdGlvbmFsXG4gICAgICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmZvOiB7IGVic1N0b3JhZ2VJbmZvOiB7IHZvbHVtZVNpemU6IDEgfX1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGNsdXN0ZXJOYW1lOiBDb25maWcuYXBwLnNlcnZpY2UgKyAnLScgKyBDb25maWcuYXBwLmVudmlyb25tZW50ICsgJy1tc2stJyArIENvbmZpZy5tc2suY2x1c3Rlck5hbWUsXG4gICAgICAgICAgICAgICAga2Fma2FWZXJzaW9uOiAnMi44LjEnLFxuICAgICAgICAgICAgICAgIG51bWJlck9mQnJva2VyTm9kZXM6IDIsXG5cbiAgICAgICAgICAgICAgICAvLyB0aGUgcHJvcGVydGllcyBiZWxvdyBhcmUgb3B0aW9uYWxcbiAgICAgICAgICAgICAgICBjbGllbnRBdXRoZW50aWNhdGlvbjoge3Nhc2w6IHtzY3JhbToge2VuYWJsZWQ6IHRydWUsfSx9LH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRPRE86IGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9BV1NKYXZhU2NyaXB0U0RLL3YzL2xhdGVzdC9jbGllbnRzL2NsaWVudC1rYWZrYS9jbGFzc2VzL2dldGJvb3RzdHJhcGJyb2tlcnNjb21tYW5kLmh0bWxcbiAgICAgICAgbGV0IGdldEJvb3RTdHJhcEJyb2tlcnMgPSBuZXcgQXdzQ3VzdG9tUmVzb3VyY2UoXG4gICAgICAgICAgICB0aGlzLCBDb25maWcuYXBwLnNlcnZpY2UgKyBcIi1cIiArIENvbmZpZy5hcHAuZW52aXJvbm1lbnQgKyBcIi1nZXQtYm9vdHN0cmFwLXNlcnZlcnNcIixcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBvblVwZGF0ZToge1xuICAgICAgICAgICAgICAgICAgICBzZXJ2aWNlOiBcImNsaWVudC1tc2tcIixcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiBcIkdldEJvb3RzdHJhcEJyb2tlcnNcIixcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyczoge0NsdXN0ZXJBcm46IG1za0NsdXN0ZXIuYXR0ckFybn0sXG4gICAgICAgICAgICAgICAgICAgIHBoeXNpY2FsUmVzb3VyY2VJZDogUGh5c2ljYWxSZXNvdXJjZUlkLm9mKG1za0NsdXN0ZXIuYXR0ckFybiksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwb2xpY3k6IEF3c0N1c3RvbVJlc291cmNlUG9saWN5LmZyb21TZGtDYWxscyh7cmVzb3VyY2VzOiBBd3NDdXN0b21SZXNvdXJjZVBvbGljeS5BTllfUkVTT1VSQ0V9KSxcbiAgICAgICAgICAgICAgICAvL1RPRE86IOyViOuQoCDqsr3smrAgQ2hhdEdQVOydmCDsobDslrjrjIDroZwgIOuzgOqyvSDqsIDriqVcbiAgICAgICAgICAgICAgICAvLyBwb2xpY3k6IEF3c0N1c3RvbVJlc291cmNlUG9saWN5LmZyb21TdGF0ZW1lbnRzKFtcbiAgICAgICAgICAgICAgICAvLyAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgYWN0aW9uczogWydtc2s6R2V0Qm9vdHN0cmFwQnJva2VycyddLFxuICAgICAgICAgICAgICAgIC8vICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICAgICAgICAgICAgICAvLyAgICAgfSksXG4gICAgICAgICAgICAgICAgLy8gXSksXG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgICAgY29uc3QgYm9vdHN0cmFwQnJva2VyU3RyaW5nID0gZ2V0Qm9vdFN0cmFwQnJva2Vycy5nZXRSZXNwb25zZUZpZWxkKFwiQm9vdHN0cmFwQnJva2VyU3RyaW5nXCIpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImJvb3RzdHJhcEJyb2tlclN0cmluZzogXCIgKyBib290c3RyYXBCcm9rZXJTdHJpbmcpO1xuXG4gICAgICAgIC8vIFVzZSBBV1MgU0RLIHRvIGZldGNoIGJvb3RzdHJhcCBicm9rZXJzXG5cbiAgICAgICAgbmV3IENmbk91dHB1dCh0aGlzLCAnbXNrQ2x1c3RlcicsIHtcbiAgICAgICAgICAgIGV4cG9ydE5hbWU6IENvbmZpZy5hcHAuc2VydmljZSArICctJyArIENvbmZpZy5hcHAuZW52aXJvbm1lbnQgKyAnLW1zay0nICsgQ29uZmlnLm1zay5jbHVzdGVyTmFtZSArIFwiLUJvb3RzdHJhcEJyb2tlcnNcIixcbiAgICAgICAgICAgIHZhbHVlOiBib290c3RyYXBCcm9rZXJTdHJpbmcsXG4gICAgICAgIH0pXG4gICAgfVxuICAgIHN1Ym5ldF9jcmVhdGlvbihzdWJuZXRfbmFtZTogc3RyaW5nLCBzdWJuZXRfY2lkcjogc3RyaW5nKTogZWMyLkNmblN1Ym5ldFxuICAgIHtcbiAgICAgICAgY29uc3Qgc3VibmV0X2dyb3VwID0gc3VibmV0X25hbWUuc2xpY2UoMCwgLTEpO1xuICAgICAgICBjb25zdCBheiA9IHN1Ym5ldF9uYW1lLnNsaWNlKC0xKTtcbiAgICAgICAgY29uc3Qgc3VibmV0ID0gbmV3IGVjMi5DZm5TdWJuZXQodGhpcywgJ3N1Ym5ldCcgKyBzdWJuZXRfbmFtZSwge1xuICAgICAgICAgICAgYXZhaWxhYmlsaXR5Wm9uZTogdGhpcy5yZWdpb24gKyBheixcbiAgICAgICAgICAgIGNpZHJCbG9jazogQ29uZmlnLnZwYy5jaWRyICsgc3VibmV0X2NpZHIsXG4gICAgICAgICAgICB2cGNJZDogdGhpcy52cGMucmVmLFxuICAgICAgICAgICAgdGFnczogW3trZXk6ICdOYW1lJywgdmFsdWU6IENvbmZpZy5hcHAuc2VydmljZSArICctJyArIENvbmZpZy5hcHAuZW52aXJvbm1lbnQgKyAnLScgKyBzdWJuZXRfZ3JvdXAgKyAnLScgKyBhen1dXG4gICAgICAgIH0pO1xuXG4gICAgICAgIG5ldyBDZm5PdXRwdXQodGhpcywgJ3N1Ym5ldCcgKyBzdWJuZXRfbmFtZSArICdvdXRwdXQnLCB7XG4gICAgICAgICAgICBleHBvcnROYW1lOiBDb25maWcuYXBwLnNlcnZpY2UgKyAnLScgKyBDb25maWcuYXBwLmVudmlyb25tZW50ICsgJy1zdWJuZXQtJyArIHN1Ym5ldF9uYW1lLFxuICAgICAgICAgICAgdmFsdWU6IHN1Ym5ldC5yZWZcbiAgICAgICAgfSlcblxuICAgICAgICByZXR1cm4gc3VibmV0O1xuICAgIH1cbn0iXX0=