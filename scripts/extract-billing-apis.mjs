import fs from 'node:fs';

const source = '2026.md';
const raw = fs.readFileSync(source, 'utf8');
const lines = raw.split('\n');

const sections = [];
let current = null;

for (const line of lines) {
  if (line.startsWith('### ')) {
    if (current) sections.push(current);
    current = { header: line.trim(), lines: [line.trim()] };
  } else if (current) {
    current.lines.push(line);
  }
}
if (current) sections.push(current);

const targets = [
  '/api/treatments-info',
  '/api/pricing/treatments',
  '/api/pricing/doctors-fees',
  '/api/pricing/lab-tests',
  '/api/pricing/imaging',
  '/api/pricing/doctors-fees/check-duplicate',
  '/api/billing/invoices',
  '/api/billing/payments',
  '/api/billing/save-invoice-pdf',
  '/api/billing/send-invoice',
  '/api/clinic-headers',
  '/api/clinic-footers',
  '/api/billing/create-payment-intent',
  '/api/billing/process-payment',
  '/api/insurance/submit-claim',
  '/api/insurance/record-payment',
  '/api/patients',
  '/api/patients/:id/appointments',
  '/api/patients/:id/lab-results',
  '/api/patients/:id/medical-imaging',
  '/api/patients/:id/prescriptions',
  '/api/appointments'
];

const retained = new Map();

const manualEntries = new Map([
  [
    '/api/treatments-info',
    [
      [
        '### GET `/api/treatments-info`',
        '',
        '- **Description:** List treatment metadata',
        '- **Authentication Required:** Yes',
        '- **Roles:** admin, doctor, nurse',
        '',
        '**cURL**',
        '```bash',
        'curl -X GET "https://{your-domain}.com/api/treatments-info" \\',
        '  -H "Authorization: Bearer <JWT_TOKEN>" \\',
        '  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \\',
        '  -H "Content-Type: application/json"',
        '```',
        '',
        '**Sample Response**',
        '```json',
        '{',
        '  "status": "success",',
        '  "data": [',
        '    {',
        '      "id": "<id>",',
        '      "name": "Physiotherapy",',
        '      "basePrice": 120,',
        '      "doctorRole": "physiotherapist"',
        '    }',
        '  ]',
        '}',
        '```'
      ],
      [
        '### POST `/api/treatments-info`',
        '',
        '- **Description:** Create treatment metadata',
        '- **Authentication Required:** Yes',
        '- **Roles:** admin, doctor, nurse',
        '',
        '**cURL**',
        '```bash',
        'curl -X POST "https://{your-domain}.com/api/treatments-info" \\',
        '  -H "Authorization: Bearer <JWT_TOKEN>" \\',
        '  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \\',
        '  -H "Content-Type: application/json" \\',
        '  -d "{\\n  \\"name\\": \\"Physiotherapy\\",\\n  \\"basePrice\\": 150,\\n  \\"colorCode\\": \\"#2563eb\\",\\n  \\"doctorRole\\": \\"physiotherapist\\",\\n  \\"doctorName\\": \\"Dr. Rivera\\",\\n  \\"doctorId\\": 12\\n}"',
        '```',
        '',
        '**Sample Request Payload**',
        '```json',
        '{',
        '  "name": "Physiotherapy",',
        '  "basePrice": 150,',
        '  "colorCode": "#2563eb",',
        '  "doctorRole": "physiotherapist",',
        '  "doctorName": "Dr. Rivera",',
        '  "doctorId": 12',
        '}',
        '```',
        '',
        '**Sample Response**',
        '```json',
        '{',
        '  "status": "success",',
        '  "data": {',
        '    "id": "<id>",',
        '    "name": "Physiotherapy",',
        '    "basePrice": 150',
        '  }',
        '}',
        '```'
      ],
      [
        '### PATCH `/api/treatments-info/:id`',
        '',
        '- **Description:** Update treatment metadata',
        '- **Authentication Required:** Yes',
        '- **Roles:** admin, doctor, nurse',
        '',
        '**cURL**',
        '```bash',
        'curl -X PATCH "https://{your-domain}.com/api/treatments-info/{id}" \\',
        '  -H "Authorization: Bearer <JWT_TOKEN>" \\',
        '  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \\',
        '  -H "Content-Type: application/json" \\',
        '  -d "{\\n  \\"basePrice\\": 160\\n}"',
        '```',
        '',
        '**Sample Request Payload**',
        '```json',
        '{',
        '  "basePrice": 160',
        '}',
        '```',
        '',
        '**Sample Response**',
        '```json',
        '{',
        '  "status": "success",',
        '  "data": {',
        '    "id": "<id>",',
        '    "basePrice": 160',
        '  }',
        '}',
        '```'
      ],
      [
        '### DELETE `/api/treatments-info/:id`',
        '',
        '- **Description:** Delete treatment metadata',
        '- **Authentication Required:** Yes',
        '- **Roles:** admin, doctor, nurse',
        '',
        '**cURL**',
        '```bash',
        'curl -X DELETE "https://{your-domain}.com/api/treatments-info/{id}" \\',
        '  -H "Authorization: Bearer <JWT_TOKEN>" \\',
        '  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>"',
        '```',
        '',
        '**Sample Response**',
        '```json',
        '{',
        '  "status": "success",',
        '  "message": "Treatment metadata deleted"',
        '}',
        '```'
      ]
    ]
  ],
  [
    '/api/pricing/treatments',
    [
      [
        '### GET `/api/pricing/treatments`',
        '',
        '- **Description:** List treatment pricing',
        '- **Authentication Required:** Yes',
        '- **Roles:** admin, doctor',
        '',
        '**cURL**',
        '```bash',
        'curl -X GET "https://{your-domain}.com/api/pricing/treatments" \\',
        '  -H "Authorization: Bearer <JWT_TOKEN>" \\',
        '  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \\',
        '  -H "Content-Type: application/json"',
        '```',
        '',
        '**Sample Response**',
        '```json',
        '{',
        '  "status": "success",',
        '  "data": [',
        '    {',
        '      "id": "<id>",',
        '      "name": "Physiotherapy",',
        '      "basePrice": 150',
        '    }',
        '  ]',
        '}',
        '```'
      ],
      [
        '### POST `/api/pricing/treatments`',
        '',
        '- **Description:** Create treatment pricing rule',
        '- **Authentication Required:** Yes',
        '- **Roles:** admin',
        '',
        '**cURL**',
        '```bash',
        'curl -X POST "https://{your-domain}.com/api/pricing/treatments" \\',
        '  -H "Authorization: Bearer <JWT_TOKEN>" \\',
        '  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \\',
        '  -H "Content-Type: application/json" \\',
        '  -d "{\\n  \\"treatmentId\\": 3,\\n  \\"price\\": 150,\\n  \\"currency\\": \\"GBP\\"\\n}"',
        '```',
        '',
        '**Sample Request Payload**',
        '```json',
        '{',
        '  "treatmentId": 3,',
        '  "price": 150,',
        '  "currency": "GBP"',
        '}',
        '```',
        '',
        '**Sample Response**',
        '```json',
        '{',
        '  "status": "success",',
        '  "data": {',
        '    "id": "<id>",',
        '    "price": 150',
        '  }',
        '}',
        '```'
      ],
      [
        '### PATCH `/api/pricing/treatments/:id`',
        '',
        '- **Description:** Update treatment pricing',
        '- **Authentication Required:** Yes',
        '- **Roles:** admin',
        '',
        '**cURL**',
        '```bash',
        'curl -X PATCH "https://{your-domain}.com/api/pricing/treatments/{id}" \\',
        '  -H "Authorization: Bearer <JWT_TOKEN>" \\',
        '  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \\',
        '  -H "Content-Type: application/json" \\',
        '  -d "{\\n  \\"price\\": 160\\n}"',
        '```',
        '',
        '**Sample Request Payload**',
        '```json',
        '{',
        '  "price": 160',
        '}',
        '```',
        '',
        '**Sample Response**',
        '```json',
        '{',
        '  "status": "success",',
        '  "data": {',
        '    "id": "<id>",',
        '    "price": 160',
        '  }',
        '}',
        '```'
      ],
      [
        '### DELETE `/api/pricing/treatments/:id`',
        '',
        '- **Description:** Delete treatment pricing rule',
        '- **Authentication Required:** Yes',
        '- **Roles:** admin',
        '',
        '**cURL**',
        '```bash',
        'curl -X DELETE "https://{your-domain}.com/api/pricing/treatments/{id}" \\',
        '  -H "Authorization: Bearer <JWT_TOKEN>" \\',
        '  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>"',
        '```',
        '',
        '**Sample Response**',
        '```json',
        '{',
        '  "status": "success",',
        '  "message": "Treatment pricing deleted"',
        '}',
        '```'
      ]
    ]
  ],
  [
    '/api/pricing/doctors-fees/check-duplicate',
    [
      [
        '### GET `/api/pricing/doctors-fees/check-duplicate`',
        '',
        '- **Description:** Check for duplicate doctor fee by role/doctor',
        '- **Authentication Required:** Yes',
        '- **Roles:** admin',
        '',
        '**cURL**',
        '```bash',
        'curl -X GET "https://{your-domain}.com/api/pricing/doctors-fees/check-duplicate?doctorRole=doctor&doctorId=5" \\',
        '  -H "Authorization: Bearer <JWT_TOKEN>" \\',
        '  -H "X-Tenant-Subdomain: <TENANT_SUBDOMAIN>" \\',
        '  -H "Content-Type: application/json"',
        '```',
        '',
        '**Sample Response**',
        '```json',
        '{',
        '  "status": "success",',
        '  "data": {',
        '    "exists": false',
        '  }',
        '}',
        '```'
      ]
    ]
  ]
]);

for (const section of sections) {
  const match = section.header.match(/`([^`]+)`/);
  if (!match) continue;
  const path = match[1];
  if (targets.includes(path)) {
    const cleaned = section.lines.filter((line) => !line.startsWith('## '));
    const existing = retained.get(path) ?? [];
    existing.push(cleaned);
    retained.set(path, existing);
  }
}

for (const [path, entries] of manualEntries) {
  const existing = retained.get(path) ?? [];
  retained.set(path, [...existing, ...entries]);
}

const order = targets.filter((path) => retained.has(path));

const outputLines = [
  '# Billing Treatment APIs from billing.tsx',
  '',
  'Extracted from `client/src/pages/billing.tsx`.',
  '',
  'Endpoints below are the ones referenced in that page related to treatment metadata, pricing, billing, payments, insurance, and patient context.',
  ''
];

for (const path of order) {
  const entries = retained.get(path) ?? [];
  for (const entry of entries) {
    outputLines.push(...entry);
    outputLines.push('');
  }
}

fs.writeFileSync('billing-apis.md', outputLines.join('\n'));
console.log('Created billing-apis.md with', order.length, 'endpoints');
