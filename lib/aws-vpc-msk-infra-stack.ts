import {
    Stack,
    StackProps,
    aws_ec2 as ec2,
    aws_msk as msk,
    aws_lambda as lambda,
    aws_iam as iam,
    CfnOutput,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import {Config} from "../config/config";
import { CustomResource } from 'aws-cdk-lib';
import path from "path";

export class AwsVpcMskInfraStack extends Stack {
    vpc: ec2.CfnVPC;
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Create vpc
        this.vpc = new ec2.CfnVPC( // TODO: 무엇을 위한 vpc 인지 확인하기
            this, "vpc", {
                cidrBlock: Config.vpc.cidr + '.0.0/16',
                enableDnsHostnames: true,
                enableDnsSupport: true,
                instanceTenancy: 'default',
                tags: [ { key: "Config.app.service" + "-" + Config.app.environment + "-vpc", value: Config.app.service + '-' + Config.app.environment} ]
            });

        new CfnOutput(this, 'vpcId', {
            exportName: Config.app.service + '-' + Config.app.environment + '-vpc-Id',
            value: this.vpc.ref,
        })


        // Create two private subnets
        const subnet_private01a: ec2.CfnSubnet = this.subnet_creation('private01a', '.96.0/20');
        const subnet_private01b: ec2.CfnSubnet = this.subnet_creation('private01b', '.112.0/20');

        // Create Security Group
        let securityGroup = new ec2.CfnSecurityGroup( // TODO: 무엇을 위한 vpc 인지 확인하기
            this, Config.app.service + "-" + Config.app.environment + "-msk-security-group", {
                vpcId: this.vpc.ref,
                groupDescription: Config.app.service + '-' + Config.app.environment + '-msk-' + Config.msk.clusterName,
                groupName: Config.app.service + '-' + Config.app.environment + '-msk-' + Config.msk.clusterName,
                securityGroupIngress: [{
                    ipProtocol: "TCP",
                    fromPort: 2181,
                    toPort: 2181,
                    cidrIp: Config.security_group[0],
                    description: Config.security_group[0]
                }],
                // tags: [{ key: 'Name', value: Config.app.service + '-' + Config.app.environment + '-msk-' + Config.msk.clusterName, }],
            });

        new CfnOutput(this, 'securityGroup', {
            exportName: Config.app.service + '-' + Config.app.environment + '-securityGroup-Id',
            value: securityGroup.attrGroupId,
        })

        // Create MSK cluster
        let mskCluster = new msk.CfnCluster(
            this, Config.app.service + "-" + Config.app.environment + "-msk-cluster", {
                brokerNodeGroupInfo: {
                    clientSubnets: [subnet_private01a.ref, subnet_private01b.ref],
                    instanceType: 'kafka.t3.small',
                    securityGroups: [securityGroup.ref],
                    // the properties below are optional
                    storageInfo: { ebsStorageInfo: { volumeSize: 1 }}
                },
                clusterName: Config.app.service + '-' + Config.app.environment + '-msk-' + Config.msk.clusterName,
                kafkaVersion: '2.8.1',
                numberOfBrokerNodes: 2,

                // the properties below are optional
                clientAuthentication: {sasl: {scram: {enabled: true,},},}
            });

        // Create lambda function, to get bootstrapbrokers
        const lambdaGetBootstrapBrokers = new lambda.Function(
            this,
            Config.app.service + "-" + Config.app.environment + "-get-bootstrapbrokers-lambda",
            {
                handler: 'get-bootstrapbrokers-lambda.lambda_handler', // Python handler format
                code: lambda.Code.fromAsset(path.join(__dirname, 'lambda')), // Update the path to your Python code
                runtime: lambda.Runtime.PYTHON_3_9, // Change to Python runtime
                description : "Lambda for get bootstrapbrokers",
                functionName: Config.app.service + "-" + Config.app.environment + "-get-bootstrapbrokers-lambda",
                environment: {
                    CLUSTER_ARN: mskCluster.attrArn,
            },
        });

        lambdaGetBootstrapBrokers.addToRolePolicy(new iam.PolicyStatement({
            actions: ['kafka:GetBootstrapBrokers'],
            resources: [mskCluster.attrArn],
        }));

        const getBootstrapBrokers = new CustomResource(
            this, Config.app.service + "-" + Config.app.environment +
            "-get-bootstrapbrokers",
            {
                serviceToken: lambdaGetBootstrapBrokers.functionArn,
            }
        );

        // get bootstrapBroker string
        const bootstrapBrokerString = getBootstrapBrokers.getAtt('BootstrapBrokerString').toString();


        new CfnOutput(this, 'mskCluster', {
            exportName: Config.app.service + '-' + Config.app.environment + '-msk-' + Config.msk.clusterName + "-BootstrapBrokers",
            value: bootstrapBrokerString,
        })
    }

    subnet_creation(subnet_name: string, subnet_cidr: string): ec2.CfnSubnet
    {
        const subnet_group = subnet_name.slice(0, -1);
        const az = subnet_name.slice(-1);
        const subnet = new ec2.CfnSubnet(this, 'subnet' + subnet_name, {
            availabilityZone: this.region + az,
            cidrBlock: Config.vpc.cidr + subnet_cidr,
            vpcId: this.vpc.ref,
            tags: [{key: 'Name', value: Config.app.service + '-' + Config.app.environment + '-' + subnet_group + '-' + az}]
        });

        new CfnOutput(this, 'subnet' + subnet_name + 'output', {
            exportName: Config.app.service + '-' + Config.app.environment + '-subnet-' + subnet_name,
            value: subnet.ref
        })

        return subnet;
    }
}