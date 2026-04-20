const { spawn } = require("child_process");
const fs = require("fs");

const asString = (value) => (typeof value === "string" ? value.trim() : "");

const cleanSeverity = (value) => {
  const normalized = asString(value).toLowerCase();
  if (!normalized) {
    return "medium";
  }

  if (normalized.includes("crit")) return "critical";
  if (normalized.includes("high")) return "high";
  if (normalized.includes("med")) return "medium";
  if (normalized.includes("low")) return "low";
  if (normalized.includes("info")) return "info";
  return "medium";
};

const runCommand = (command, args, timeoutMs) => {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const done = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    const timeoutHandle = setTimeout(() => {
      try {
        child.kill();
      } catch (_error) {
        // Ignore kill errors for already-closed process.
      }

      done({
        ok: false,
        timedOut: true,
        stdout,
        stderr,
        exitCode: null,
      });
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timeoutHandle);
      done({
        ok: false,
        timedOut: false,
        stdout,
        stderr: `${stderr}\n${error.message}`,
        exitCode: null,
      });
    });

    child.on("close", (exitCode) => {
      clearTimeout(timeoutHandle);
      done({
        ok: exitCode === 0,
        timedOut: false,
        stdout,
        stderr,
        exitCode,
      });
    });
  });
};

const resolveNucleiExecutable = () => {
  const configured = asString(process.env.FALLBACK_NUCLEI_BIN);
  const candidates = [
    configured,
    "nuclei",
    "C:\\Program Files (x86)\\Nmap\\nuclei.exe",
    "C:\\Program Files\\Nmap\\nuclei.exe",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate.toLowerCase() === "nuclei") {
      return candidate;
    }

    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (_error) {
      // Ignore path checks and continue candidates.
    }
  }

  return "nuclei";
};

const buildNucleiArgs = ({ target, tags, templates }) => {
  const args = [
    "-u",
    target,
    "-jsonl",
    "-silent",
    "-nc",
    "-timeout",
    "8",
    "-retries",
    "1",
  ];

  const normalizedTemplates = Array.isArray(templates)
    ? templates.map((item) => asString(item)).filter(Boolean)
    : [];

  for (const templatePath of normalizedTemplates) {
    args.push("-t", templatePath);
  }

  if (tags && tags.toLowerCase() !== "all") {
    args.push("-tags", tags);
  }

  return args;
};

const parseNucleiJsonLines = (stdout) => {
  const lines = asString(stdout)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const findings = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const severity = cleanSeverity(entry?.info?.severity || entry?.severity);
      const title = asString(entry?.info?.name) || asString(entry?.matcher_name) || "Nuclei Finding";
      const description =
        asString(entry?.info?.description) ||
        asString(entry?.template_id) ||
        "Nuclei reported a potential issue";
      const cveCandidate = asString(entry?.classification?.cve_id || entry?.template_id).toUpperCase();
      const cveId = /^CVE-\d{4}-\d{4,7}$/i.test(cveCandidate) ? cveCandidate : null;

      findings.push({
        cveId,
        title,
        description,
        severity,
        evidence: asString(entry?.matched_at) || asString(entry?.host) || line,
      });
    } catch (_error) {
      // Ignore non-JSON lines.
    }
  }

  return findings;
};

exports.scan = async (targetUrl) => {
  const target = asString(targetUrl);
  if (!target) {
    return [];
  }

  const timeoutMs = Number(process.env.FALLBACK_NUCLEI_TIMEOUT_MS) > 0
    ? Number(process.env.FALLBACK_NUCLEI_TIMEOUT_MS)
    : 180000;

  const tags = asString(process.env.FALLBACK_NUCLEI_TAGS);
  const defaultTemplates = [
    "C:\\Users\\msi\\nuclei-templates\\http\\misconfiguration\\cookies-without-httponly.yaml",
    "C:\\Users\\msi\\nuclei-templates\\http\\misconfiguration\\cookies-without-secure.yaml",
  ];

  const envTemplates = asString(process.env.FALLBACK_NUCLEI_TEMPLATES)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const templates = envTemplates.length > 0 ? envTemplates : defaultTemplates;

  const executable = resolveNucleiExecutable();

  const templateResult = await runCommand(
    executable,
    buildNucleiArgs({ target, tags: "", templates }),
    timeoutMs
  );

  const tagResult =
    tags && tags.toLowerCase() !== "none"
      ? await runCommand(executable, buildNucleiArgs({ target, tags, templates: [] }), timeoutMs)
      : { stdout: "", ok: true };

  const mergedOutput = [asString(templateResult.stdout), asString(tagResult.stdout)]
    .filter(Boolean)
    .join("\n");

  if (!mergedOutput) {
    return [];
  }

  return parseNucleiJsonLines(mergedOutput);
};
