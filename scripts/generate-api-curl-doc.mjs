import fs from 'node:fs';
import path from 'node:path';

const docPath = path.resolve('api_calls_documentation.json');
const doc = JSON.parse(fs.readFileSync(docPath, 'utf8'));
const baseUrl = 'https://{your-domain}.com';
const tokenPlaceholder = '<JWT_TOKEN>';
const tenantPlaceholder = '<TENANT_SUBDOMAIN>';

const listKeywords = [
  'list',
  'search',
  'history',
  'records',
  'results',
  'appointments',
  'patients',
  'doctors',
  'roles',
  'users',
  'notifications',
  'invoices',
  'claims',
  'tests',
  'messages',
  'templates',
  'campaigns',
  'forms',
  'integrations',
  'insights',
  'reports',
  'documents',
  'categories',
  'shifts',
  'services',
  'analytics'
];

const isArrayLike = (text) => listKeywords.some((kw) => text.includes(kw));

const formatPathForCurl = (rawPath) => rawPath.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');

const createSampleBody = (method, rawPath, description) => {
  if (!['POST', 'PUT', 'PATCH'].includes(method)) {
    return null;
  }
  const placeholder = description ?? rawPath;
  return `{
  "note": "Replace this payload with valid values for ${placeholder}",
  "example": "test"
}`;
};

const createSampleResponse = (method, rawPath, description) => {
  const text = `${description ?? ''} ${rawPath}`.toLowerCase();
  const payload = isArrayLike(text)
    ? `[
  {
    "id": "<id>",
    "message": "Sample item for ${rawPath}"
  }
]`
    : `{
  "id": "<id>",
  "message": "Sample result for ${rawPath}"
}`;

  return `{
  "status": "success",
  "data": ${payload}
}`;
};

const lines = [];
lines.push('# API cURL Catalog for Postman Testing');
lines.push('');
lines.push('Base domain: `https://{your-domain}.com` (replace with your deployment)');
lines.push('Base path: inherent in each endpoint.');
lines.push('');
lines.push('Headers to include in every authenticated request:');
lines.push('- `Authorization: Bearer <JWT_TOKEN>`');
lines.push('- `X-Tenant-Subdomain: <tenant_subdomain>`');
lines.push('- `Content-Type: application/json` (if the request has a body)');
lines.push('');
lines.push('Replace placeholder values before executing the requests below.');
lines.push('');

const categories = doc.categories ?? [];
for (const category of categories) {
  lines.push(`## ${category.name}`);
  lines.push('');
  for (const endpoint of category.endpoints ?? []) {
    const method = endpoint.method;
    const rawPath = endpoint.path;
    const curlPath = formatPathForCurl(rawPath);
    const description = endpoint.description ?? 'No description provided.';
    const auth = endpoint.auth ? 'Yes' : 'No';
    const roles = (endpoint.roles ?? []).length > 0 ? endpoint.roles.join(', ') : 'N/A';

    lines.push(`### ${method} \`${rawPath}\``);
    lines.push('');
    lines.push(`- **Description:** ${description}`);
    lines.push(`- **Authentication Required:** ${auth}`);
    lines.push(`- **Roles:** ${roles}`);
    lines.push('');
    lines.push('**cURL**');
    lines.push('```bash');
    lines.push(`curl -X ${method} "${baseUrl}${curlPath}" \\`);
    lines.push(`  -H "Authorization: Bearer ${tokenPlaceholder}" \\`);
    lines.push(`  -H "X-Tenant-Subdomain: ${tenantPlaceholder}" \\`);
    const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);
    if (hasBody) {
      lines.push('  -H "Content-Type: application/json" \\');
      const sampleBody = createSampleBody(method, rawPath, description);
      const sanitizedBody = sampleBody.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      lines.push(`  -d "${sanitizedBody}"`);
    } else {
      lines.push('  -H "Content-Type: application/json"');
    }
    lines.push('```');
    lines.push('');
    if (hasBody) {
      lines.push('**Sample Request Payload**');
      lines.push('```json');
      lines.push(createSampleBody(method, rawPath, description));
      lines.push('```');
      lines.push('');
    }
    lines.push('**Sample Response**');
    lines.push('```json');
    lines.push(createSampleResponse(method, rawPath, description));
    lines.push('```');
    lines.push('');
  }
}

const outputPath = path.resolve('API_POSTMAN_CURL.md');
fs.writeFileSync(outputPath, lines.join('\n'));
console.log(`Generated ${outputPath}`);
