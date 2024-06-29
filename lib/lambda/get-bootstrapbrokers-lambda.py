import boto3
import os
import json
import urllib.request

def send_response(event, context, response_status, response_data):
    print("event")
    print(event)
    print("context")
    print(context)
    response_body = json.dumps({
        "Status": response_status,
        "Reason": "See the details in CloudWatch Log Stream: " + context.log_stream_name,
        "PhysicalResourceId": context.log_stream_name,
        "StackId": event['StackId'],
        "RequestId": event['RequestId'],
        "LogicalResourceId": event['LogicalResourceId'],
        "Data": response_data
    })
    print(response_body)

    response_url = event['ResponseURL']
    data = response_body.encode('utf-8')
    headers = {'content-type': '', 'content-length': str(len(data))}

    req = urllib.request.Request(response_url, data, headers, method='PUT')
    with urllib.request.urlopen(req) as f:
        print("Status code:", f.status)

def lambda_handler(event, context):
    client = boto3.client('kafka')
    cluster_arn = os.environ['CLUSTER_ARN']

    try:
        response = client.get_bootstrap_brokers(ClusterArn=cluster_arn)
        bootstrap_broker_string = response['BootstrapBrokerStringSaslScram']

        # CloudFormation에 성공 응답 보내기
        send_response(event, context, "SUCCESS", {"BootstrapBrokerString": bootstrap_broker_string})
    except Exception as e:
        print(f"Error getting bootstrap brokers: {str(e)}")
        # CloudFormation에 실패 응답 보내기
        send_response(event, context, "FAILED", {"Error": str(e)})
