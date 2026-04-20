const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const seeds = [
  // --- A01: Broken Access Control ---
  {
    cveId: "OWASP-2021-A01-IDOR",
    title: "Insecure Direct Object Reference (IDOR)",
    description: "Application allows access to objects directly through user-supplied input without proper authorization checks.",
    severity: "high",
    cvssScore: 7.5,
    source: "seed"
  },
  {
    cveId: "OWASP-2021-A01-TRAVERSAL",
    title: "Path Traversal / LFI",
    description: "Attacker can read arbitrary files from the server's filesystem by manipulating file path parameters.",
    severity: "high",
    cvssScore: 8.1,
    source: "seed"
  },

  // --- A02: Cryptographic Failures ---
  {
    cveId: "OWASP-2021-A02-HARDCODED-SECRET",
    title: "Hardcoded Sensitive Secret",
    description: "Secrets like API keys, passwords, or encryption keys are embedded directly in the source code or configuration files.",
    severity: "critical",
    cvssScore: 9.1,
    source: "seed"
  },
  {
    cveId: "OWASP-2021-A02-WEAK-TLS",
    title: "Weak TLS Configuration",
    description: "The server supports deprecated TLS versions or weak cipher suites that are vulnerable to decryption.",
    severity: "medium",
    cvssScore: 4.3,
    source: "seed"
  },

  // --- A03: Injection ---
  {
    cveId: "OWASP-2021-A03-SQLI",
    title: "SQL Injection",
    description: "Database queries are constructed using untrusted input, allowing attackers to manipulate queries.",
    severity: "critical",
    cvssScore: 9.8,
    source: "seed"
  },
  {
    cveId: "OWASP-2021-A03-SSTI",
    title: "Server-Side Template Injection (SSTI)",
    description: "Insecure integration of user input into web templates allows remote code execution on the server.",
    severity: "critical",
    cvssScore: 10.0,
    source: "seed"
  },
  {
    cveId: "OWASP-2021-A03-CMD-INJECTION",
    title: "Command Injection",
    description: "Application executes arbitrary system commands supplied by the user.",
    severity: "critical",
    cvssScore: 10.0,
    source: "seed"
  },
  {
    cveId: "OWASP-2021-A03-XXE",
    title: "XML External Entity (XXE) Injection",
    description: "Weakly configured XML parser processes external entities, potentially leading to LFI or SSRF.",
    severity: "high",
    cvssScore: 8.2,
    source: "seed"
  },

  // --- A04: Insecure Design ---
  {
    cveId: "OWASP-2021-A04-XSS-REFLECTED",
    title: "Reflected Cross-Site Scripting (XSS)",
    description: "Untrusted data is reflected back to the user without proper validation or escaping, allowing script execution in the browser.",
    severity: "medium",
    cvssScore: 6.1,
    source: "seed"
  },

  // --- A05: Security Misconfiguration ---
  {
    cveId: "OWASP-2021-A05-DIR-LISTING",
    title: "Directory Listing Enabled",
    description: "Web server is configured to list the contents of directories, potentially exposing sensitive files.",
    severity: "low",
    cvssScore: 3.3,
    source: "seed"
  },
  {
    cveId: "OWASP-2021-A05-DEFAULT-CREDS",
    title: "Default Administrative Credentials",
    description: "Application or service uses default, well-known credentials for administration.",
    severity: "critical",
    cvssScore: 9.8,
    source: "seed"
  },

  // --- A07: Identification and Authentication Failures ---
  {
    cveId: "OWASP-2021-A07-AUTH-BYPASS",
    title: "Authentication Bypass",
    description: "Flaws in authentication logic allow attackers to gain access to accounts without valid credentials.",
    severity: "critical",
    cvssScore: 9.1,
    source: "seed"
  },

  // --- A08: Software and Data Integrity Failures ---
  {
    cveId: "OWASP-2021-A08-DESERIALIZATION",
    title: "Insecure Deserialization",
    description: "Untrusted data is deserialized into objects, potentially leading to remote code execution.",
    severity: "critical",
    cvssScore: 9.8,
    source: "seed"
  },

  // --- A10: Server-Side Request Forgery ---
  {
    cveId: "OWASP-2021-A10-SSRF",
    title: "Server-Side Request Forgery (SSRF)",
    description: "The web application fetches a remote resource without validating the user-supplied URL, allowing requests to internal services.",
    severity: "high",
    cvssScore: 8.6,
    source: "seed"
  },

  // --- Advanced Tools & Specific Markers ---
  {
    cveId: "NIKTO-SENSITIVE-LOG",
    title: "Nikto: Exposed Sensitive Log File",
    description: "Scanner discovered logs or backup files that may contain technical or user secrets.",
    severity: "medium",
    cvssScore: 5.0,
    source: "seed"
  },
  {
    cveId: "NUCLEI-GIT-EXPOSURE",
    title: "Nuclei: Exposed .git Repository",
    description: "The .git directory is publicly accessible, allowing attackers to download the full source code and history.",
    severity: "high",
    cvssScore: 7.5,
    source: "seed"
  },
  {
    cveId: "NUCLEI-S3-TAKEOVER",
    title: "Nuclei: Permissive S3 Bucket Policy",
    description: "Identified an incorrectly configured S3 bucket that allows public read/write access.",
    severity: "high",
    cvssScore: 7.3,
    source: "seed"
  },
  {
    cveId: "GENERIC-OPEN-REDIRECT",
    title: "Open Redirect",
    description: "An unvalidated redirect parameter allows attackers to redirect users to malicious external domains.",
    severity: "low",
    cvssScore: 3.8,
    source: "seed"
  },
  {
    cveId: "OWASP-2021-A02-JWT-NONE",
    title: "JWT 'none' Algorithm Allowed",
    description: "The application accepts JSON Web Tokens with the 'none' algorithm, allowing attackers to bypass authentication by providing unsigned tokens.",
    severity: "critical",
    cvssScore: 9.1,
    source: "seed"
  },
  {
    cveId: "OWASP-2021-A02-JWT-WEAK-SECRET",
    title: "JWT Weak HMAC Secret",
    description: "The application uses a weak or predictable secret key for signing JWTs, making them susceptible to brute-force attacks.",
    severity: "high",
    cvssScore: 7.4,
    source: "seed"
  },
  {
    cveId: "OWASP-2021-A03-NOSQL-INJECTION",
    title: "NoSQL Injection",
    description: "Input is used in NoSQL database queries without sanitization, potentially leading to data leakage or authentication bypass.",
    severity: "high",
    cvssScore: 8.5,
    source: "seed"
  },
  {
    cveId: "OWASP-2021-A03-LDAP-INJECTION",
    title: "LDAP Injection",
    description: "Improperly sanitized input is used in LDAP queries, allowing attackers to view or modify directory data.",
    severity: "medium",
    cvssScore: 6.5,
    source: "seed"
  },
  {
    cveId: "OWASP-2021-A03-GRAPHQL-INJECTION",
    title: "GraphQL Injection / Introspection",
    description: "GraphQL introspection is enabled or queries are susceptible to injection, potentially exposing the entire schema and data.",
    severity: "medium",
    cvssScore: 5.0,
    source: "seed"
  },
  {
    cveId: "OWASP-2021-A05-EXPOSED-ENV",
    title: "Exposed .env Configuration File",
    description: "Sensitive environment variables, including database credentials and API keys, are publicly accessible.",
    severity: "critical",
    cvssScore: 9.8,
    source: "seed"
  },
  {
    cveId: "OWASP-2021-A05-EXPOSED-GIT",
    title: "Exposed .git Repository",
    description: "Public access to the .git directory exposes source code history and potentially sensitive developer secrets.",
    severity: "high",
    cvssScore: 7.5,
    source: "seed"
  },
  {
    cveId: "OWASP-2021-A07-SESSION-FIXATION",
    title: "Session Fixation",
    description: "Application fails to renew the session ID after authentication, allowing attackers to hijack sessions.",
    severity: "medium",
    cvssScore: 6.1,
    source: "seed"
  },
  {
    cveId: "OWASP-2021-A08-UNTRUSTED-DESERIALIZATION",
    title: "Deserialization of Untrusted Data",
    description: "Insecurely deserializing user-controlled objects can lead to arbitrary code execution (RCE).",
    severity: "critical",
    cvssScore: 10.0,
    source: "seed"
  },
  {
    cveId: "CLOUD-AWS-METADATA-SSRF",
    title: "AWS Metadata Service SSRF",
    description: "Target is vulnerable to SSRF allowing access to the AWS Metadata Service (169.254.169.254), leaking dynamic credentials.",
    severity: "critical",
    cvssScore: 9.3,
    source: "seed"
  },
  {
    cveId: "CLOUD-GCP-METADATA-SSRF",
    title: "GCP Metadata Service SSRF",
    description: "Target is vulnerable to SSRF allowing access to the GCP Metadata Service, potentially leaking service account tokens.",
    severity: "critical",
    cvssScore: 9.3,
    source: "seed"
  },
  {
    cveId: "CLOUD-AZURE-METADATA-SSRF",
    title: "Azure Metadata Service SSRF",
    description: "Target is vulnerable to SSRF allowing access to the Azure Instance Metadata Service, potentially leaking managed identity tokens.",
    severity: "critical",
    cvssScore: 9.3,
    source: "seed"
  },
  {
    cveId: "GENERIC-CLICKJACKING",
    title: "Clickjacking / Missing X-Frame-Options",
    description: "Application is susceptible to UI redressing attacks due to missing framing protection headers.",
    severity: "low",
    cvssScore: 3.5,
    source: "seed"
  },
  {
    cveId: "GENERIC-CORS-PERMISSIVE",
    title: "Permissive CORS Policy (Access-Control-Allow-Origin: *)",
    description: "Excessively broad CORS configuration allows any external origin to read response data.",
    severity: "medium",
    cvssScore: 5.3,
    source: "seed"
  },
  {
    cveId: "GENERIC-SENSITIVE-LOGS",
    title: "Exposed Log or Backup Files",
    description: "Common backup or log file names (e.g., .log, .bak, .old) found accessible on the server.",
    severity: "medium",
    cvssScore: 5.0,
    source: "seed"
  }
];

async function main() {
  console.log('Seeding vulnerabilities (Mega-Library expansion)...');
  for (const seed of seeds) {
    await prisma.vulnerability.upsert({
      where: { cveId: seed.cveId },
      update: seed,
      create: seed,
    });
  }
  console.log('Done.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
