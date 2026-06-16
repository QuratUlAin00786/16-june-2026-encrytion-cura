const fs = require("fs");
const path = require("path");

const content = fs.readFileSync(path.resolve(__dirname, "../server/routes.ts"), "utf-8");
const regex = /app\.(get|post|put|patch|delete)\(([^,]+),/g;
const lines = [];
let match;

while ((match = regex.exec(content))) {
  const method = match[1].toUpperCase();
  const route = match[2].trim().replace(/^['"`]|['"`]$/g, "");
  lines.push(`- **${method}** ${route}`);
}

fs.writeFileSync(path.resolve(__dirname, "../latest-api.md"), "## Generated API routes\n\n" + lines.join("\n"));
