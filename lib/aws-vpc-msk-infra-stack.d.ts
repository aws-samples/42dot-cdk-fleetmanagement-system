import { Stack, StackProps, aws_ec2 as ec2 } from "aws-cdk-lib";
import { Construct } from "constructs";
export declare class AwsVpcMskInfraStack extends Stack {
    vpc: ec2.CfnVPC;
    constructor(scope: Construct, id: string, props?: StackProps);
    subnet_creation(subnet_name: string, subnet_cidr: string): ec2.CfnSubnet;
}
