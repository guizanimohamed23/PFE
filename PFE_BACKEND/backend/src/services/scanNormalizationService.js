const SEVERITY_VALUES = ["critical", "high", "medium", "low", "info"];
const DEBUG_NORMALIZATION = process.env.SCAN_NORMALIZATION_DEBUG === "true";

const asString = (value) => (typeof value === "string" ? value.trim() : "");

const sanitizeForLog = (value) => asString(value).replace(/[^\x20-\x7E]/g, "?");

const logDebug = (...args) => {
  if (!DEBUG_NORMALIZATION) {
    return;
  }

  const safeArgs = args.map((arg) => {
    if (typeof arg === "string") {
      return sanitizeForLog(arg);
    }

    try {
      return sanitizeForLog(JSON.stringify(arg));
    } catch (_error) {
      return "[unserializable]";
    }
  });

  console.log(...safeArgs);
};

const cleanSeverity = (value) => {
  const normalized = asString(value).toLowerCase();
  if (!normalized) {
    return "medium";
  }

  if (SEVERITY_VALUES.includes(normalized)) {
    return normalized;
  }

  if (normalized.includes("crit")) return "critical";
  if (normalized.includes("high")) return "high";
  if (normalized.includes("med")) return "medium";
  if (normalized.includes("low")) return "low";
  return "medium";
};

const pickFirst = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && asString(value)) {
      return asString(value);
    }
  }
  return "";
};

const extractCve = (obj) => {
  const candidates = [
    asString(obj?.cveId),
    asString(obj?.cve_id),
    asString(obj?.cve),
    asString(obj?.vuln_id),
    asString(obj?.id),
  ];

  const text = candidates.find(Boolean) || "";
  const match = text.match(/CVE-\d{4}-\d{4,7}/i);
  return match ? match[0].toUpperCase() : null;
};

const inferSeverityFromText = (text) => {
  const normalized = asString(text).toLowerCase();
  if (!normalized) {
    return "medium";
  }

  // 1. High-Impact Promotion (Case-Insensitive)
  if (HIGH_IMPACT_MARKERS.some(marker => normalized.includes(marker.toLowerCase()))) {
    return "critical";
  }

  // 2. Explicit Tool Rating Check
  if (normalized.includes("critical")) return "critical";
  if (normalized.includes("high")) return "high";
  if (normalized.includes("medium")) return "medium";
  if (normalized.includes("low")) return "low";

  // 3. Vulnerability Class Heuristics
  if (normalized.includes("rce") || normalized.includes("injection") || normalized.includes("ssrf") || normalized.includes("ssti")) {
    return "high";
  }

  return "medium";
};

const compactEvidence = (stdout, stderr) => {
  const merged = [asString(stdout), asString(stderr)].filter(Boolean).join("\n");
  if (!merged) {
    return "No scanner evidence provided";
  }

  // Store an informative preview while keeping ScanResult size bounded.
  return merged.slice(0, 4000);
};

const toPositiveInt = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

const VULNERABILITY_TOKENS = [
  // --- A01: Broken Access Control ---
  "idor",
  "insecure direct object reference",
  "bolp",
  "access control bypass",
  "privilege escalation",
  "unauthorized access",
  "forbidden resource",
  "security bypass",
  "directory traversal",
  "path traversal",
  "lfi",
  "local file inclusion",
  "rfi",
  "remote file inclusion",

  // --- A02: Cryptographic Failures ---
  "weak crypto",
  "deprecated tls",
  "weak cipher",
  "weak hsts",
  "plain-text password",
  "hardcoded secret",
  "jwt weak secret",
  "exposed private key",
  "weak encryption",
  "insecure hashing",

  // --- A03: Injection (Broad & Specific) ---
  "sqli",
  "sql injection",
  "command injection",
  "nosqli",
  "nosql injection",
  "ssti",
  "server side template injection",
  "template injection",
  "xxe",
  "xml external entity",
  "ldap injection",
  "xpath injection",
  "graphql injection",
  "header injection",
  "host header injection",
  "crlf injection",

  // --- A04: Insecure Design ---
  "csrf",
  "cross-site request forgery",
  "missing csrf token",
  "clickjacking",
  "ui redressing",

  // --- A05: Security Misconfiguration ---
  "directory listing",
  "exposed directory",
  "default credentials",
  "exposed stack trace",
  "verbose error",
  "debug mode enabled",
  "phpinfo()",
  "server banner disclosure",
  "info disclosure",
  "unsupported version",
  "outdated server",

  // --- A07: Identification and Authentication Failures ---
  "authentication bypass",
  "weak password",
  "no rate limit",
  "session fixation",
  "insecure session",
  "missing httponly",
  "missing secure attribute",

  // --- A08: Software and Data Integrity Failures ---
  "insecure deserialization",
  "object injection",
  "untrusted data",

  // --- A10: Server-Side Request Forgery ---
  "ssrf",
  "server side request forgery",
  "metadata extraction",
  "internal ip disclosure",
  "localhost proxy",

  // --- Advanced & Common Findings ---
  "open redirect",
  "cors misconfiguration",
  "permissive cors",
  "smuggling",
  "request smuggling",
  "cache poisoning",
  "sensitive data exposure",
  "leaked api key",
  "exposed config",
  "env file disclosed",
  "git repository found",
  "subdomain takeover",
];

const RUNTIME_NOISE_PATTERNS = [
  "traceback (most recent call last)",
  "modulenotfounderror",
  "importerror",
  "distributionnotfound",
  "versionconflict",
  "server error:",
  "server error",
  "exception:",
  "usage:",
  "error in ",
  "failed to execute",
  "command not found",
  "is not recognized as an internal or external command",
  "no module named",
  "pkg_resources",
  "deprecationwarning",
  "requestsdependencywarning",
  "urllib3 doesn't match",
  "dependency warning",
];

const BANNER_NOISE_PATTERNS = [
  "legal disclaimer: usage of sqlmap",
  "starting @",
  "ending @",
  "powerful open-source xss scanner",
  "sqlmap/",
  "dalfox",
];

const TOOL_NOISE_LINE_PATTERNS = [
  /^::\s+(url|progress|job|duration|errors|method)\s*:/i,   // ffuf header lines
  /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}/,             // date-prefixed tool logs (gobuster etc.)
  /^\[.*\]\s+\d{4}\/\d{2}\/\d{2}/,                         // bracket-date tool logs
  /progress:\s*\[?\d+\/\d+\]?/i,                            // progress counters
  /^->/,                                                     // arrow prefixed output
  /error sending request/i,
  /could not connect/i,
  /skipped.*due to error/i,
  /unable to split/i,
  /off'r'nperl/i,                                            // nikto binary path noise
  /^\s*\|_\|[vV]/,                                          // sqlmap ASCII banner (v or V)
  /^\s*https?:\/\/sqlmap\.org/i,                            // sqlmap homepage line
  /^do you want to/i,                                        // sqlmap interactive prompts
  /timeout occurred/i,                                       // generic timeouts
  /error on running \w+/i,                                   // "error on running gobuster/nikto/..."
  /warning:/i,                                               // Python/tool warnings
  /deprecation/i,                                            // DeprecationWarning etc.
  /urllib3/i,                                                // urllib3 warnings (dependencies)
  /version.*conflict/i,                                      // Version conflicts
];

const TOOL_VULN_PATTERNS = [
  /\[crit/, /\[high/, /\[med/, /\[low/, /\[info/,
  /\[xss/, /\[sqli/, /\[ssrf/, /\[rce/, /\[idor/, /\[lfi/, /\[xxe/, /\[csrf/,
  /\[vulnerability/, /\[vuln/
];

const TOOL_ERROR_PATTERNS = [
  "connection aborted",
  "connection refused",
  "failed to connect",
  "encountered an error",
  "traceback (most recent call last)",
  "socket error",
  "unreachable",
  "dns resolution failed",
  "timeout occurred",
  "request failed",
  "could not resolve host",
  "permission denied",
];

const DEFAULT_CVSS_BY_SEVERITY = {
  critical: 9.0,
  high: 7.5,
  medium: 5.0,
  low: 2.5,
  info: 0.0,
};

const STRONG_POSITIVE_SIGNALS = [
  "is vulnerable",
  "sql injection vulnerability",
  "payload:",
  "triggered xss payload",
  "back-end dbms",
  "database management system",
  "[critical]",
  "[high]",
  "[medium]",
  "[200]",
  "200 ok",
  "[poc][v]",
  "cve-",
  "template_id",
  "matched_at",
  "uid=0(root)",
  "root:x:0:0",
  "nt authority\\system",
];

const HIGH_IMPACT_MARKERS = [
  "uid=0(root)",
  "root:x:0:0",
  "nt authority\\system",
  "database dumped",
  "fetching credentials",
  "cracked password",
  "admin:password",
  "administrator:",
  "-----begin rsa private key-----",
  "akia", // AWS access key pattern start
  "sk-", // OpenAI secret key pattern start
  "eyj", // JWT header start
];

const THREAT_TITLES = [
  { kw: "sqli", title: "SQL Injection" },
  { kw: "sql", title: "SQL Injection" },
  { kw: "xss", title: "Cross-Site Scripting" },
  { kw: "ssrf", title: "Server-Side Request Forgery" },
  { kw: "ssti", title: "Server-Side Template Injection" },
  { kw: "idor", title: "Insecure Direct Object Reference" },
  { kw: "lfi", title: "Local File Inclusion" },
  { kw: "rfi", title: "Remote File Inclusion" },
  { kw: "xxe", title: "XML External Entity Injection" },
  { kw: "path traversal", title: "Path Traversal" },
  { kw: "rce", title: "Remote Command Execution" },
  { kw: "command", title: "Remote Command Execution" },
  { kw: "auth", title: "Authentication Bypass" },
  { kw: "secret", title: "Sensitive Secret Exposure" },
  { kw: "key", title: "Sensitive Key Exposure" },
  { kw: ".env", title: "Environment File Exposure" },
  { kw: "env", title: "Environment File Exposure" },
  { kw: "cookie", title: "Session Cookie Misconfiguration" },
  { kw: "session", title: "Session Management Vulnerability" },
  { kw: "header", title: "Security Header Misconfiguration" },
  { kw: "transport", title: "Insecure Transport Protocol" },
  { kw: "param", title: "Hidden Parameter Discovered" },
];

const hasPattern = (text, patterns) => {
  const normalized = asString(text).toLowerCase();
  if (!normalized) {
    return false;
  }

  return patterns.some((pattern) => normalized.includes(pattern));
};

const POSITIVE_FINDING_HINTS = [
  "vulnerable",
  "vulnerability",
  "exploit",
  "injection",
  "payload",
  "match",
  "matched",
  "alert",
  "cve-",
  "critical",
  "high",
  "medium",
  "low",
  "rce",
  "execution",
  "disclosure",
  "leak",
];

const NEGATIVE_FINDING_HINTS = [
  "command",
  "executing",
  "executed",
  "starting",
  "completed",
  "finished",
  "target url",
  "target url:",
  "target:",
  "scan target",
  "lookup completed successfully",
  "off 'r'perl",
  "off'r'nperl",
];

const hasPositiveFindingHint = (text) => hasPattern(text, POSITIVE_FINDING_HINTS);
const hasNegativeFindingHint = (text) => hasPattern(text, NEGATIVE_FINDING_HINTS);

const isCommandEchoOrMetadata = (title, description, evidence) => {
  const merged = `${asString(title)}\n${asString(description)}\n${asString(evidence)}`.toLowerCase();
  if (!merged) {
    return true;
  }

  if (isRuntimeNoiseText(merged) || isBannerOnlyText(merged)) {
    return true;
  }

  if (hasNegativeFindingHint(merged) && !hasPositiveFindingHint(merged)) {
    return true;
  }

  if (hasPattern(merged, TOOL_ERROR_PATTERNS)) {
    return true;
  }

  return false;
};

const hasStrongPositiveSignals = (text) => hasPattern(text, STRONG_POSITIVE_SIGNALS);

const isRuntimeNoiseText = (text) => {
  const normalized = asString(text).toLowerCase();
  if (!normalized) {
    return false;
  }

  return hasPattern(normalized, RUNTIME_NOISE_PATTERNS);
};

const isBannerOnlyText = (text) => {
  const normalized = asString(text).toLowerCase();
  if (!normalized) {
    return false;
  }

  return hasPattern(normalized, BANNER_NOISE_PATTERNS) && !hasStrongPositiveSignals(normalized);
};

const hasUsefulTokens = (text) => {
  const normalized = asString(text).toLowerCase();
  if (!normalized) {
    return false;
  }

  return VULNERABILITY_TOKENS.some((token) => normalized.includes(token));
};

const hasSqlmapPositiveEvidence = (stdout, stderr) => {
  const normalized = `${asString(stdout)}\n${asString(stderr)}`.toLowerCase();
  if (!normalized) {
    return false;
  }

  // Hard fail signals — these mean the scan couldn't even run properly
  const hardFailSignals = [
    "unable to connect",
    "connection timed out",
    "target url is not reachable",
    "critical connection exception",
    "unable to establish",
    "no parameter(s) found for testing",
  ];

  if (hardFailSignals.some((token) => normalized.includes(token))) {
    return false;
  }

  // Strong positive signals — confirmed vulnerability evidence
  // These override "not injectable" for individual parameters
  const strongPositiveSignals = [
    // Discovery-mode signals (first-time injection detection)
    "back-end dbms",
    "database management system",
    "sql injection vulnerability",
    "is vulnerable",
    "payload:",
    "type: boolean-based",
    "type: error-based",
    "type: time-based",
    "type: union query",
    "title: and boolean",
    "title: or boolean",
    "the back-end",
    "mysql",
    "postgresql",
    "oracle",
    "sqlite",
    "uid=",
    "gid=",
    "groups=",
    "database is",
    "success:",
    // Resume-mode signals (session-resumed sqlmap output)
    "resuming back-end",
    "resumed:",
    "database:",
    "available databases",
    "table:",
    "column:",
    "entries]",
    "dumped to",
    "retrieved:",
    "fetched data logged",
  ];

  if (strongPositiveSignals.some((token) => normalized.includes(token))) {
    return true;
  }

  // "all tested parameters" means full failure — trust it
  if (normalized.includes("all tested parameters do not appear to be injectable")) {
    return false;
  }

  // Weak positive — "injectable" alone could appear in "not injectable" for individual params
  // Only trust if no global failure statement is present
  if (normalized.includes("injectable") && !normalized.includes("all tested parameters")) {
    return true;
  }

  // Handle case where stdout is JSON (HexStrike may return structured sqlmap output)
  try {
    const parsed = JSON.parse(asString(stdout));
    if (parsed?.vulnerable === true || parsed?.data || parsed?.injections) {
      return true;
    }
  } catch {
    // Not JSON — fall through
  }

  return false;
};

const parseExitCode = (value) => {
  const candidates = [
    value?.exit_code,
    value?.exitCode,
    value?.return_code,
    value?.returnCode,
    value?.code,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === "") {
      continue;
    }

    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return null;
};

const collectStructuredToolFindings = (tool) => {
  const candidates = [];
  const arrays = [
    tool?.findings,
    tool?.vulnerabilities,
    tool?.results,
    tool?.issues,
    tool?.alerts,
    tool?.matches,
    tool?.detections,
    tool?.items,
    tool?.entries,
    tool?.data,
  ];

  for (const item of arrays) {
    if (Array.isArray(item)) {
      candidates.push(...item);
    }
  }

  return candidates
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => normalizeEntry(entry));
};

const getThreatTitle = (text, defaultTitle, toolName) => {
  const normalized = asString(text).toLowerCase();
  for (const mapping of THREAT_TITLES) {
    if (normalized.includes(mapping.kw)) {
      return `${mapping.title} (via ${toolName})`;
    }
  }
  return defaultTitle;
};

// Filter stderr for Python/dependency warnings and tool noise
const isStderrNoise = (line) => {
  const lower = asString(line).toLowerCase();
  if (!lower) return false;
  
  const stderrNoisePatterns = [
    "requestsdependencywarning",
    "deprecationwarning",
    "futureuserwarning",  
    "urllib3.connectionpool",
    "doesn't match a supported version",
    "unverified https request",
    "ssl: certificate_verify_failed",
    "retrying request",
    "connection pool is full",
    "overflowing pool",
    "warning",  // Generic warning keyword
  ];
  
  return stderrNoisePatterns.some(pattern => lower.includes(pattern));
};

const extractFindingsFromPlainText = (toolName, stdout, stderr) => {
  const findings = [];
  
  // Filter out stderr if it's pure noise (dependency warnings, etc.)
  const stderrLines = asString(stderr).split("\n");
  const stderrNonNoise = stderrLines.filter(line => !isStderrNoise(line)).join("\n");
  
  const combined = `${asString(stdout)}\n${stderrNonNoise}`;

  if (!combined || combined.length < 10) {
    return findings;
  }

  // Split into lines and look for lines that suggest findings.
  const lines = combined.split("\n").filter((line) => {
    const trimmed = asString(line).trim();
    return (
      trimmed.length > 10 &&
      (!trimmed.startsWith("[") || TOOL_VULN_PATTERNS.some(p => p.test(trimmed.toLowerCase()))) &&
      !trimmed.startsWith("{") &&
      !trimmed.match(/^(Starting|Checking|Testing|Scanning|Running|Finished|Completed)/i) &&
      !TOOL_NOISE_LINE_PATTERNS.some((pattern) => pattern.test(trimmed))
    );
  });

  const vulnKeywords = [
    "vulnerability",
    "vulnerable",
    "xss",
    "sql",
    "injection",
    "rce",
    "command",
    "path",
    "directory",
    "disclosure",
    "leak",
    "weakness",
    "misconfiguration",
    "exposure",
    "bypass",
    "authentication",
    "authorization",
    "env",
    "config",
    "credential",
    "secret",
    "token",
    "password",
    "key",
    "disclosure",
    "leaked",
    "django",
    "x-powered-by",
    "framework",
    "apache",
    "nginx",
    "cookie",
    "session",
    "header",
    "login",
    "transport",
    "parameter",
    "param",
  ];

  for (const line of lines) {
    const lower = line.toLowerCase();
    
    // Skip anything that looks like an error, warning, or traceback
    if (lower.includes("traceback") || lower.includes("exception") || lower.includes("warning:") || hasPattern(lower, TOOL_ERROR_PATTERNS)) {
      continue;
    }
    
    // Skip pure tool noise (progress, verbose output, etc.)
    if (isRuntimeNoiseText(lower)) {
      continue;
    }
    
    const hasVulnKeyword = vulnKeywords.some((keyword) => lower.includes(keyword));

    if (!hasVulnKeyword) {
      continue;
    }
    
    // Require STRONG positive signals when only matching broad keywords like "env"
    // This prevents false positives from words like "environment" in error messages
    const hasPositiveSignal = hasStrongPositiveSignals(line) || hasPositiveFindingHint(line);
    const isBroadKeywordOnly = (lower.includes("env") || lower.includes("config")) && 
                               !lower.includes("disclosure") && 
                               !lower.includes("exposed") &&
                               !lower.includes("leaked") &&
                               !lower.includes("file");
    
    if (isBroadKeywordOnly && !hasPositiveSignal) {
      continue; // Skip broad keywords without positive signals
    }

    const conciseTitle = line.length > 96 ? `${line.substring(0, 96)}...` : line;
    const defaultTitle = `${toolName}: ${conciseTitle}`;
    const title = getThreatTitle(line, defaultTitle, toolName);

    findings.push({
      tool: toolName, 
      cveId: null,
      title,
      description: `Finding from ${toolName} plain text output.`,
      severity: inferSeverityFromText(combined), 
      evidence: line.substring(0, 500),
    });

    if (findings.length >= 10) {
      break;
    }
  }

  return findings;
};

const isToolExecutionFailed = (tool) => {
  const status = asString(tool?.status).toLowerCase();
  const success = tool?.success;
  const exitCode = parseExitCode(tool);
  const toolName = asString(tool?.tool).toLowerCase();
  const stderr = asString(tool?.stderr).toLowerCase();
  const stdout = asString(tool?.stdout).toLowerCase();
  const merged = `${status}\n${stderr}\n${stdout}`;

  if (typeof success === "boolean" && success === false) {
    return true;
  }

  // Nuclei exits with code 1 when no findings — treat as success with empty results
  if (exitCode !== null && exitCode !== 0 && toolName !== "nuclei") {
    return true;
  }

  if (["failed", "error", "timeout", "unreachable"].some((token) => status.includes(token))) {
    return true;
  }

  return ["timeout", "timed out", "deadline exceeded"].some((token) => merged.includes(token));
};

const parseNucleiPlainTextFindings = (stdout, evidence) => {
  const findings = [];
  const lines = asString(stdout).split("\n");

  for (const line of lines) {
    // Nuclei plain text format can be:
    // [template-id] [matcher-name] [severity] URL
    // OR [template-id] [severity] URL
    const brackets = line.match(/^\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.+)$/) ||
                     line.match(/^\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.+)$/);
    
    if (!brackets) continue;

    let templateId, matcher, severity, url;
    if (brackets.length === 5) {
      [, templateId, matcher, severity, url] = brackets;
    } else {
      [, templateId, severity, url] = brackets;
      matcher = "Detection";
    }

    // Create a concise title mapping
    let threatName = "";
    const lowerId = templateId.toLowerCase();
    for (const mapping of THREAT_TITLES) {
      if (lowerId.includes(mapping.kw)) {
        threatName = mapping.title;
        break;
      }
    }

    // Promote based on evidence in whole output + current line
    const severityToUse = inferSeverityFromText(`${line}\n${stdout}`);

    findings.push({
      tool: "nuclei",
      cveId: templateId.match(/CVE-\d{4}-\d+/i)?.[0]?.toUpperCase() || null,
      title: threatName ? `${threatName} (via Nuclei)` : `${templateId} (${matcher})`,
      description: `Nuclei detected: ${templateId} at ${url}`,
      severity: severityToUse, 
      evidence: url || (line + (evidence !== line ? "\n" + evidence : "")),
    });

    if (findings.length >= 10) break;
  }

  return findings;
};

const normalizeFromToolExecution = (scanResults) => {
  const tools = (
    Array.isArray(scanResults?.tools_executed) ? scanResults.tools_executed :
    Array.isArray(scanResults?.tool_results)   ? scanResults.tool_results :
    Array.isArray(scanResults?.agent_results)  ? scanResults.agent_results :
    Array.isArray(scanResults?.results)        ? scanResults.results :
    Array.isArray(scanResults?.scan_results)   ? scanResults.scan_results :
    []
  );
  logDebug(`[normalizeFromToolExecution] resolved tools length=${tools.length} from keys=[${Object.keys(scanResults || {}).join(",")}]`);
  const findings = [];

  for (const tool of tools) {
    const reportedCount = toPositiveInt(tool?.vulnerabilities_found);
    const toolName = asString(tool?.tool).toLowerCase();
    const stdout = asString(tool?.stdout);
    const stderr = asString(tool?.stderr);
    const evidence = compactEvidence(stdout, stderr);
    const combinedOutput = `${stdout}\n${stderr}`;
    const structuredFindings = collectStructuredToolFindings(tool);
    const toolFailed = isToolExecutionFailed(tool);
    const outputIsNoise = isRuntimeNoiseText(combinedOutput) || isBannerOnlyText(combinedOutput);

    if (structuredFindings.length > 0) {
      findings.push(...structuredFindings);
    }

    logDebug(
      `[tool] ${toolName || "unknown"} failed=${toolFailed} reported=${tool?.vulnerabilities_found || 0} stdout=${stdout.length} stderr=${stderr.length}`
    );

    // Try to parse Nuclei JSON output for individual findings.
    if (toolName === "nuclei" && stdout) {
      try {
        const lines = stdout.split("\n").filter(Boolean);
        logDebug(`[nuclei] Found ${lines.length} stdout lines`);
        
        let parsedCount = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          try {
            const finding = JSON.parse(line);
            logDebug(`[nuclei] Line ${i} parsed template=${finding.template_id || "unknown"}`);
            
            if (finding.template_id || finding.matcher_name || finding.info) {
              const normalized = {
                cveId: finding.template_id || null,
                title: finding.info?.name || finding.matcher_name || "Nuclei Detection",
                description:
                  finding.info?.description ||
                  `Nuclei template: ${finding.template_id || "unknown"}`,
                severity: cleanSeverity(finding.info?.severity || "medium"),
                evidence: finding.matched_at || evidence,
              };
              logDebug(`[nuclei] Added finding: ${normalized.title}`);
              findings.push(normalized);
              parsedCount++;
            }
          } catch (e) {
            logDebug(`[nuclei] Line ${i} not JSON`);
          }
        }
        logDebug(`[nuclei] Parsed ${parsedCount} findings`);

        if (parsedCount > 0) {
          // If tool reports more findings than we could parse, synthesize the missing ones.
          for (let i = parsedCount; i < reportedCount; i += 1) {
            findings.push({
              cveId: null,
              title: `Nuclei reported finding #${i + 1}`,
              description: "Nuclei reported additional finding details not available in structured output.",
              severity: cleanSeverity(tool?.parameters?.severity || inferSeverityFromText(stdout)),
              evidence: `${evidence}\n[synthesized index=${i + 1}]`,
            });
          }
          continue;
        }

        const plainTextFindings = parseNucleiPlainTextFindings(stdout, evidence);
        if (plainTextFindings.length > 0) {
          findings.push(...plainTextFindings);

          for (let i = plainTextFindings.length; i < reportedCount; i += 1) {
            findings.push({
              cveId: null,
              title: `Nuclei reported finding #${i + 1}`,
              description: "Nuclei reported additional finding details not available in structured output.",
              severity: cleanSeverity(tool?.parameters?.severity || inferSeverityFromText(stdout)),
              evidence: `${evidence}\n[synthesized index=${i + 1}]`,
            });
          }
          continue;
        }
      } catch (parseError) {
        logDebug(`[nuclei] Failed parsing output: ${parseError.message}`);
        // Continue to count-based synthesis below.
      }
    }

    if (toolFailed) {
      // Never promote failed tool output into vulnerabilities.
      continue;
    }

    if (toolName !== "nuclei" && !outputIsNoise) {
      const textFindings = extractFindingsFromPlainText(toolName, stdout, stderr);
      if (textFindings.length > 0) {
        findings.push(...textFindings);
      }
    }

    if (reportedCount <= 0) {
      continue;
    }

    // Count-based synthesis fallback: create one normalized finding per reported vulnerability.
    for (let i = 0; i < reportedCount; i += 1) {
      if (toolName === "sqlmap") {
        const sqlmapConfirmed = hasSqlmapPositiveEvidence(stdout, stderr);
        if (!sqlmapConfirmed) {
          continue;
        }

        findings.push({
          tool: "sqlmap",
          cveId: "OWASP-2021-A03",
          title: `Potential SQL Injection${reportedCount > 1 ? ` #${i + 1}` : ""}`,
          description: sqlmapConfirmed
            ? "SQLMap reported positive SQL injection evidence for the target URL."
            : "SQLMap reported potential SQL injection findings for the target URL.",
          severity: inferSeverityFromText(`${stdout}\n${stderr}`),
          evidence: `${evidence}\n[synthesized index=${i + 1}]`,
        });
        continue;
      }

      // Do not create generic synthetic findings for non-sqlmap tools.
      // They create noisy false positives when tool outputs are banners/errors.
      continue;
    }
  }

  logDebug(`[normalizeFromToolExecution] Returning ${findings.length} findings`);
  return findings;
};

const normalizeEntry = (entry) => {
  const cveId = extractCve(entry);
  const title =
    pickFirst(entry, ["title", "name", "vulnerability", "issue", "finding"]) ||
    (cveId ? `Detected vulnerability ${cveId}` : "Detected vulnerability");

  const description =
    pickFirst(entry, ["description", "details", "message", "summary", "output", "stdout", "stderr"]) ||
    "No description provided by scanner";

  const severity = cleanSeverity(
    pickFirst(entry, ["severity", "risk", "priority", "cvss_severity", "level"])
  );

  const evidence =
    pickFirst(entry, ["evidence", "proof", "payload", "stdout", "stderr", "command", "url"]) ||
    description;

  const rawCvss = entry?.cvss_score ?? entry?.cvssScore ?? entry?.score ?? entry?.cvss ?? null;
  const cvssScore =
    Number.isFinite(Number(rawCvss))
      ? Number(rawCvss)
      : DEFAULT_CVSS_BY_SEVERITY[severity] ?? null;

  if (!cveId && isCommandEchoOrMetadata(title, description, evidence)) {
    return null;
  }

  if (!cveId && !hasPositiveFindingHint(`${title}\n${description}\n${evidence}`)) {
    return null;
  }

  return {
    cveId,
    title,
    description,
    severity,
    cvssScore,
    evidence: evidence.slice(0, 4000),
  };
};

const isLowValueFinding = (finding) => {
  const title = asString(finding?.title).toLowerCase();
  const description = asString(finding?.description).toLowerCase();
  const evidence = asString(finding?.evidence).toLowerCase();
  const merged = `${title}\n${description}\n${evidence}`;

  // 1. Noise detection (Runtime errors, tool banners)
  const isRuntimeNoise = isRuntimeNoiseText(merged) || isBannerOnlyText(merged);
  if (isRuntimeNoise) {
    logDebug(`[isLowValueFinding] Filtered out runtime noise: "${finding?.title}"`);
    return true;
  }

  // 2. High-Confidence Protect: If it has a CVE or strong signature, it is NOT low value.
  if (finding?.cveId || hasStrongPositiveSignals(merged)) {
    return false;
  }

  // 3. Metadata Suppression: Filter out generic "Command started" or "Scan complete" echos.
  const isMetadataLike = hasNegativeFindingHint(merged) && !hasPositiveFindingHint(merged);
  if (isMetadataLike) {
    logDebug(`[isLowValueFinding] Filtered out metadata echo: "${finding?.title}"`);
    return true;
  }

  // 4. Vagueness Check: Filter out findings that are generic "vulnerability detected" without proof.
  const genericTitle = title === "detected vulnerability" || title === "vulnerability found";
  const genericDescription = description === "no description provided by scanner";
  const genericEvidence =
    evidence === "no description provided by scanner" || evidence === "no scanner evidence provided";

  if (genericTitle && genericDescription && genericEvidence) {
    logDebug(`[isLowValueFinding] Filtered out generic finding without proof: "${finding?.title}"`);
    return true;
  }

  // 5. Tool Error Filter: Catch common tool error strings disguised as findings.
  if (hasPattern(merged, TOOL_ERROR_PATTERNS)) {
    logDebug(`[isLowValueFinding] Filtered out tool error pattern: "${finding?.title}"`);
    return true;
  }

  return false;
};

const looksLikeFinding = (node) => {
  if (!node || typeof node !== "object") {
    return false;
  }

  const keys = Object.keys(node);
  return [
    "title",
    "name",
    "alert",
    "description",
    "severity",
    "risk",
    "confidence",
    "cve",
    "cve_id",
    "cveId",
    "evidence",
    "match",
    "matches",
    "remediation",
    "solution",
  ].some((key) => keys.includes(key));
};

const collectFindings = (scanResults) => {
  const findings = [];

  const visit = (node, path = "") => {
    if (!node) {
      return;
    }

    if (Array.isArray(node)) {
      // Do not recursively enter large raw tool output blocks, 
      // but ALLOW scan_results.findings which contains pre-parsed high-fidelity data
      if (path.includes("tools_executed") || (path.includes("scan_results") && !path.includes("findings"))) {
        return;
      }
      node.forEach((item, i) => visit(item, `${path}[${i}]`));
      return;
    }

    if (typeof node !== "object") {
      return;
    }

    if (looksLikeFinding(node)) {
      findings.push(node);
    }

    Object.keys(node).forEach((key) => {
      // SHIELD: Specific blacklisted keys that contain raw tool data
      // We allow 'findings' specifically to pass through
      if (["tools_executed", "tool_results", "executions"].includes(key) || (key === "scan_results" && !node.findings)) {
        return;
      }
      visit(node[key], `${path}.${key}`);
    });
  };

  visit(scanResults);
  return findings;
};

const normalizeHexstrikeResultsInternal = (scanPayload) => {
  const scanResults = scanPayload?.scanResults || scanPayload || {};

  // 1. Primary Tool Parsing (High Quality)
  const toolDerived = normalizeFromToolExecution(scanResults);
  
  // 2. Secondary Generic Discovery (Discovery of non-standard structures)
  const generic = collectFindings(scanResults).map(normalizeEntry).filter(Boolean);
  
  // 3. Unification
  const normalized = [...toolDerived, ...generic];

  logDebug(
    `[normalization] Raw findings: ${normalized.length} tool=${toolDerived.length} generic=${generic.length}`
  );

  const deduped = normalized.filter((item, index, arr) => {
    // Stricter signature including Tool and a snippet of evidence to prevent bleeding
    const partialEvidence = asString(item.evidence).substring(0, 100).toLowerCase();
    const signature = `${item.tool || "generic"}|${item.cveId || "none"}|${item.title}|${partialEvidence}`.toLowerCase();
    
    const isDupe = arr.findIndex((candidate) => {
      const candidatePartial = asString(candidate.evidence).substring(0, 100).toLowerCase();
      const candidateSignature = `${candidate.tool || "generic"}|${candidate.cveId || "none"}|${candidate.title}|${candidatePartial}`.toLowerCase();
      return signature === candidateSignature;
    }) !== index;

    if (isDupe) {
      logDebug(`[dedup] Removed duplicate: "${item.title}"`);
    }

    return !isDupe;
  });

  logDebug(`[normalization] After dedup: ${deduped.length}`);

  const filtered = deduped.filter((finding) => !isLowValueFinding(finding));
  const filteredCount = deduped.length - filtered.length;

  logDebug(`[normalization] After low-value filter: ${filtered.length}`);

  return {
    findings: filtered,
    stats: {
      rawToolFindings: toolDerived.length,
      rawGenericFindings: generic.length,
      rawTotalFindings: normalized.length,
      dedupedFindings: deduped.length,
      filteredFindings: filtered.length,
      droppedFindings: filteredCount,
    },
  };
};

exports.normalizeHexstrikeResults = (scanPayload) => normalizeHexstrikeResultsInternal(scanPayload).findings;
exports.normalizeHexstrikeResultsDetailed = (scanPayload) => normalizeHexstrikeResultsInternal(scanPayload);
