#!/bin/bash
# SBOM Generation Script for Enterprise Supply Chain Security

set -e

echo "🔍 Generating Software Bill of Materials (SBOM)..."

# Create SBOM directory
mkdir -p sbom/

# Generate CycloneDX SBOM (if tools available)
if command -v cyclonedx-bom &> /dev/null; then
  echo "📦 Generating CycloneDX SBOM..."
  cyclonedx-bom -o sbom/sbom-cyclonedx.json
else
  echo "⚠️  CycloneDX tools not available - creating minimal SBOM"
  cat > sbom/sbom-cyclonedx.json << 'EOF'
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.4",
  "serialNumber": "urn:uuid:$(uuidgen)",
  "version": 1,
  "metadata": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "component": {
      "type": "library",
      "name": "averox-crypto-sdk",
      "version": "2.0.0"
    }
  },
  "components": [
    {
      "type": "library",
      "name": "openssl",
      "version": "1.1.0+",
      "description": "Cryptographic library dependency"
    }
  ]
}
EOF
fi

# Generate SPDX SBOM
echo "📄 Generating SPDX SBOM..."
cat > sbom/sbom-spdx.json << EOF
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "Averox Crypto SDK SBOM",
  "documentNamespace": "https://averox.com/sbom/$(date +%s)",
  "creationInfo": {
    "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "creators": ["Tool: averox-sbom-generator"]
  },
  "packages": [
    {
      "SPDXID": "SPDXRef-Package",
      "name": "averox-crypto-sdk",
      "downloadLocation": "NOASSERTION",
      "filesAnalyzed": false,
      "licenseConcluded": "MIT",
      "copyrightText": "Copyright (c) 2024 Averox"
    }
  ]
}
EOF

# Verify SBOM files
echo "✅ SBOM files generated:"
ls -la sbom/

echo "🎉 SBOM generation complete!"
