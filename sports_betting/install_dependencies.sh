#!/bin/bash
# Install required dependencies for sports betting collectors

echo "Installing Python dependencies..."
sudo apt-get update
sudo apt-get install -y python3-bs4 python3-requests

echo ""
echo "Verifying installation..."
python3 -c "import requests; print('✓ requests installed')"
python3 -c "import bs4; print('✓ beautifulsoup4 installed')"

echo ""
echo "Dependencies installed successfully!"
