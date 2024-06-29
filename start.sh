#!/bin/bash

# Reset terminal input settings
stty sane

# Prompt for AWS account_id and region_name
echo "Please provide the following details:"
echo "Enter AWS account_id: "
read account_id
echo "Enter AWS region_name: "
read region_name

# Function to update the configuration files
update_config_file() {
    local file=$1
    local account_id=$2
    local region_name=$3
    
    if [ -f "$file" ]; then
        sed -i.bak "s/account: \".*\"/account: \"$account_id\"/" "$file" && rm "${file}.bak"
        sed -i.bak "s/region: \".*\"/region: \"$region_name\"/" "$file" && rm "${file}.bak"
        echo "$file has been updated successfully."
    else
        echo "Error: $file not found."
    fi
}

# Update config.ts file
update_config_file "config/config.ts" "$account_id" "$region_name"

# Update config.js file
update_config_file "config/config.js" "$account_id" "$region_name"

echo "config.ts and config.js have been updated successfully."
cdk bootstrap aws://$account_id/$region_name
echo "deploy cdk stacks"
cdk deploy AwsVpcMskInfraStack --require-approval never
cdk deploy AwsIotCoreProvisioningInfraStack --require-approval never
cdk deploy AwsIotCoreRuleInfraStack --require-approval never