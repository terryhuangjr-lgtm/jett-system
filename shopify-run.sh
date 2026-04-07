#!/bin/bash
unset SHOPIFY_TOKEN SHOPIFY_STORE SHOPIFY_LOCATION_ID
export $(grep -v "^#" /home/clawd/.env | xargs)
node /home/clawd/skills/shopify-manager/run.js "$@"
