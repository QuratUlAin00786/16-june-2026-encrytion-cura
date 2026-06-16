const fs = require('fs');
const path = require('path');

const doc = require('../api_calls_documentation.json');

const BASE_HOST = 'https://{subdomain}.curaemr.ai';
const BASE_PATH = doc.baseUrl || '/api';

const HEADER_NOTE = [
  '# API Testing Guide for Postman',
  '',
  '*Generated from `api_calls_documentation.json`. Replace `{subdomain}` with your tenant and `<YOUR_JWT_TOKEN>` with a valid token.*',
  '',
  '## Base Setup',
  '',
  '- Base URL: `' + BASE_HOST + '`',
  `- Default headers: \`Authorization: Bearer <YOUR_JWT_TOKEN>\`, \`Content-Type: application/json\`, \`Accept: application/json\`, \`X-Tenant-Subdomain: cura\`',
  '- For GET/DELETE endpoints there is no request body. For POST/PUT/PATCH endpoints, a sample payload is shown.',
  '',
  '---',
  ''
].join('\n');

const specialBodies = new Map([
  ['/api/auth/login', { email: 'doctor@cura.com', password: 'doctor123' }],
  ['/api/auth/universal-login', { email: 'admin@cura.com', password: 'admin123' }],
  ['/api/auth/forgot-password', { email: 'user@example.com' }],
  ['/api/auth/reset-password', { token: 'abc123-reset-token', newPassword: 'NewSecurePass!23' }],
  ['/api/user/change-password', { currentPassword: 'oldPassword456', newPassword: 'NewSecurePass!23' }],
  ['/api/saas/login', { email: 'saas_admin@curaemr.ai', password: 'saas_admin_password' }],
  ['/api/create-payment-intent', { amount: 5000, currency: 'usd', patientId: 101 }],
  ['/api/appointments', { patientId: 101, doctorId: 202, startTime: '2026-02-01T09:00:00Z', reason: 'Follow-up' }],
  ['/api/patients', { firstName: 'Jane', lastName: 'Doe', email: 'jane.patient@example.com', dateOfBirth: '1985-07-19' }],
  ['/api/prescriptions', { patientId: 101, doctorId: 202, medications: [{ name: 'Atorvastatin', dosage: '10mg' }], notes: 'Take once daily' }],
  ['/api/lab-results', { patientId: 101, testType: 'CBC', priority: 'normal', instructions: 'Fasting for 12 hours' }],
  ['/api/notifications', { title: 'New lab result', message: 'Your CBC is ready', patientId: 101 }],
  ['/api/users', { firstName: 'Alex', lastName: 'Team', email: 'alex.team@cura.com', role: 'nurse' }],
  ['/api/roles', { name: 'assistant', permissions: ['appointments:read', 'appointments:update'] }],
  ['/api/gdpr/consent', { patientId: 101, consentGiven: true, scope: ['medicalRecords', 'notifications'] }],
  ['/api/automation/rules/:id/toggle', { enabled: true }],
  ['/api/messaging/send', { to: '+15555555555', channel: 'sms', template: 'appointment-reminder' }],
  ['/api/ai/chat', { model: 'gpt-4.1', prompt: 'Summarize the latest patient visit notes.' }],
]);

const bodyPatterns = [
  { test: /patients/, body: { firstName: 'Sam', lastName: 'Patient', email: 'sam.patient@example.com', phone: '+15555555555' } },
  { test: /appointments/, body: { patientId: 101, doctorId: 202, startTime: '2026-01-21T13:00:00Z', status: 'scheduled' } },
  { test: /prescriptions/, body: { patientId: 101, medications: [{ name: 'Ibuprofen', dosage: '400mg' }], instructions: 'Take three times daily' } },
  { test: /lab-results/, body: { patientId: 101, testType: 'CMP', notes: 'Fasting sample', status: 'pending' } },
  { test: /billing/, body: { patientId: 101, amount: 15000, currency: 'usd', description: 'Consultation' } },
  { test: /notifications/, body: { title: 'Reminder', message: 'Your appointment is tomorrow at 09:00' } },
  { test: /users/, body: { firstName: 'Case', lastName: 'User', email: 'case.user@cura.com', role: 'nurse' } },
  { test: /roles/, body: { name: 'custom-role', permissions: ['records:read', 'records:update'] } },
  { test: /files/, body: { fileId: 'abc123', purpose: 'medical-record', expiresInMinutes: 60 } },
  { test: /integrations/, body: { provider: 'quickbooks', action: 'connect' } },
];

function formatPath(path) {
  return path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
}

function needsBody(method) {
  return ['POST', 'PUT', 'PATCH'].includes(method);
}

function sampleRequestBody(method, path) {
  if (!needsBody(method)) return null;
  if (specialBodies.has(path)) return specialBodies.get(path);
  const patternMatch = bodyPatterns.find(({ test }) => test.test(path));
  if (patternMatch) return patternMatch.body;
  return { exampleField: 'exampleValue' };
}

function sampleResponse(method) {
  if (method === 'GET') {
    return {
      status: 'success',
      data: [{ id: 1, placeholder: true }],
    };
  }
  if (method === 'POST') {
    return {
      status: 'created',
      id: 101,
      message: 'Resource created successfully',
    };
  }
  if (method === 'DELETE') {
    return {
      status: 'deleted',
      message: 'Resource removed successfully',
    };
  }
  return {
    status: 'ok',
    id: 101,
    message: 'Operation succeeded',
  };
}

function formatCurl(method, path, body) {
  const endpoint = formatPath(path);
  const url = `${BASE_HOST}${endpoint}`;
  let command = `curl -X ${method} "${url}" \\\n  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \\\n  -H "Content-Type: application/json" \\\n  -H "Accept: application/json" \\\n  -H "X-Tenant-Subdomain: cura"`;
  if (body) {
    const payload = JSON.stringify(body, null, 2);
    const escaped = payload.replace(/'/g, "\\'");
    command += ` \\\n  -d '${escaped}'`;
  }
  return command;
}

function generateCategorySection(category) {
  const lines = [];
  lines.push(`## ${category.name}`);
  lines.push('');

  category.endpoints.forEach((endpoint) => {
    const title = `### \`${endpoint.method} ${endpoint.path}\``;
    const description = endpoint.description ? endpoint.description : 'No description provided.';
    const authTag = endpoint.auth ? 'Required' : 'Not required';
    const roles = endpoint.roles ? endpoint.roles.join(', ') : 'N/A';
    const requestBody = sampleRequestBody(endpoint.method, endpoint.path);
    const responseSample = sampleResponse(endpoint.method);
    lines.push(title);
    lines.push('');
    lines.push(`- **Description:** ${description}`);
    lines.push(`- **Authentication:** ${authTag}`);
    lines.push(`- **Roles:** ${roles}`);
    lines.push('');
    lines.push('#### Sample cURL');
    lines.push('```bash');
    lines.push(formatCurl(endpoint.method, endpoint.path, requestBody));
    lines.push('```');
    if (requestBody) {
      lines.push('');
      lines.push('#### Sample Request Body');
      lines.push('```json');
      lines.push(JSON.stringify(requestBody, null, 2));
      lines.push('```');
    }
    lines.push('');
    lines.push('#### Sample Response');
    lines.push('```json');
    lines.push(JSON.stringify(responseSample, null, 2));
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

function generateMarkdown() {
  const sections = [HEADER_NOTE];
  doc.categories.forEach((category) => {
    sections.push(generateCategorySection(category));
  });
  return sections.join('\n');
}

function main() {
  const outputPath = path.resolve(__dirname, '../API_CURL_TESTING_REFERENCE.md');
  const content = generateMarkdown();
  fs.writeFileSync(outputPath, content);
  console.log('Generated', outputPath);
}

main();
