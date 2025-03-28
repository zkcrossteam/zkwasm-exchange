#!/bin/bash
set -euo pipefail

# 加载环境变量
if [ -f .env ]; then
  echo "Loading environment variables from .env file"
  source .env
elif [ -f ../.env ]; then
  echo "Loading environment variables from parent directory .env file"
  source ../.env
else
  echo "No .env file found"
  exit 1
fi

# Clean the private key by removing any carriage returns or whitespace
CLEAN_PRIVATE_KEY=$(echo "${USER_PRIVATE_ACCOUNT}" | tr -d '\r\n\t ')

# Clean the user address and ensure proper format (remove whitespace and ensure 0x prefix)
CLEAN_USER_ADDRESS=$(echo "${USER_ADDRESS}" | tr -d '\r\n\t ' | sed 's/^0x//i' | sed 's/^/0x/')

# Verify address length (should be 42 characters including 0x prefix)
if [ ${#CLEAN_USER_ADDRESS} -ne 42 ]; then
  echo "Error: User address has invalid length. Expected 42 characters (including 0x prefix), got ${#CLEAN_USER_ADDRESS}"
  echo "Address: ${CLEAN_USER_ADDRESS}"
  exit 1
fi

echo "Using address: ${CLEAN_USER_ADDRESS}"
echo "Using private key: ${CLEAN_PRIVATE_KEY:0:6}...${CLEAN_PRIVATE_KEY: -4}"

PUBLISH_CMD="node ./node_modules/zkwasm-service-cli/dist/index.js addimage -r \"https://rpc.zkwasmhub.com:8090\" -p \"./node_modules/zkwasm-ts-server/src/application/application_bg.wasm\" -u \"${CLEAN_USER_ADDRESS}\" -x \"${CLEAN_PRIVATE_KEY}\" -d \"Multi User App\" -c 22 --auto_submit_network_ids 11155111 -n \"zkwasm-automata\" --creator_only_add_prove_task true"

if [ "FALSE" = "TRUE" ] || [ "FALSE" = "true" ]; then
  if [ -n "" ]; then
    echo "Migration enabled, adding import_data_image parameter with value: "
    PUBLISH_CMD="${PUBLISH_CMD} --import_data_image "
  else
    echo "Warning: Migration is enabled but MIGRATE_IMAGE_VALUE is not set"
  fi
fi

# 执行命令
echo "Executing publish command..."
eval ${PUBLISH_CMD}
