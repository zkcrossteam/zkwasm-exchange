#!/bin/bash

# Strict error handling
set -euo pipefail

# Set up paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load environment variables
if [ -f "${PROJECT_ROOT}/.env" ]; then
    echo "Loading environment variables from .env file"
    source "${PROJECT_ROOT}/.env"
else
    echo "Error: No .env file found in ${PROJECT_ROOT}"
    exit 1
fi

# Verify required environment variables
if [ -z "${USER_ADDRESS:-}" ] || [ -z "${USER_PRIVATE_ACCOUNT:-}" ]; then
    echo "Error: Required environment variables USER_ADDRESS and USER_PRIVATE_ACCOUNT must be set"
    exit 1
fi

# Verify required files exist
CLI_PATH="${SCRIPT_DIR}/node_modules/zkwasm-service-cli/dist/index.js"
WASM_PATH="${SCRIPT_DIR}/node_modules/zkwasm-ts-server/src/application/application_bg.wasm"

if [ ! -f "$CLI_PATH" ]; then
    echo "Error: zkwasm-service-cli not found at ${CLI_PATH}"
    exit 1
fi

if [ ! -f "$WASM_PATH" ]; then
    echo "Error: WASM file not found at ${WASM_PATH}"
    exit 1
fi

# Change to project root for consistent relative paths
cd "${PROJECT_ROOT}"

# Construct and execute publish command
PUBLISH_CMD="node \"${CLI_PATH}\" addimage \
    -r \"https://rpc.zkwasmhub.com:8090\" \
    -p \"${WASM_PATH}\" \
    -u \"${USER_ADDRESS}\" \
    -x \"${USER_PRIVATE_ACCOUNT}\" \
    -d \"Multi User App\" \
    -c 22 \
    --auto_submit_network_ids 56 \
    -n \"zkwasm-exchange\" \
    --creator_only_add_prove_task true"

if [ "${MIGRATE_VALUE:-FALSE}" = "TRUE" ] || [ "${MIGRATE_VALUE:-FALSE}" = "true" ]; then
    if [ -n "${MIGRATE_IMAGE_VALUE:-}" ]; then
        echo "Migration enabled, adding import_data_image parameter with value: ${MIGRATE_IMAGE_VALUE}"
        PUBLISH_CMD="${PUBLISH_CMD} --import_data_image ${MIGRATE_IMAGE_VALUE}"
    else
        echo "Warning: Migration is enabled but MIGRATE_IMAGE_VALUE is not set"
    fi
fi

# Execute command
echo "Executing publish command..."
eval ${PUBLISH_CMD}
