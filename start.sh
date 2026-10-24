#!/bin/bash
MAINNET_PROVIDER_URL='http://192.168.85.8:8545' OPTIMISM_PROVIDER_URL='https://mainnet.optimism.io' MINIO_ROOT_USER=minio MINIO_ROOT_PASSWORD=minio123 IPFS_URL=https://v1.repo.usecannon.com docker compose up "$@"
