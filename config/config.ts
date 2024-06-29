const Config = {
    aws: {
        account: "<<account_id>>",
        region: "<<region_name>>",
    },

    app: {
        service: 'fleetmgmt',
        application: 'iot',
        environment: 'dev'
      },
    s3BucketName : "cdk-s3-test-bucket",

    // Assume that you have created a VPC with two subnets and a security group
    vpc: {
        cidr: '10.51'
    },
    security_group: ['10.42.0.0/23', 'fleetmgmt'],

    msk: {
        clusterName: "cdk-iot-msk-cluster",
    }
};
export { Config };
