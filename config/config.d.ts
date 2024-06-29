declare const Config: {
    aws: {
        account: string;
        region: string;
    };
    app: {
        service: string;
        application: string;
        environment: string;
    };
    s3BucketName: string;
    vpc: {
        cidr: string;
    };
    security_group: string[];
    msk: {
        clusterName: string;
    };
};
export { Config };
