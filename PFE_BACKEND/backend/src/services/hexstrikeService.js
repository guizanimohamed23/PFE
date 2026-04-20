const axios = require("axios");

const DEFAULT_BASE_URL = "http://127.0.0.1:8888";
const DEFAULT_TIMEOUT_MS = 1800000;
const DEFAULT_OBJECTIVE = "comprehensive";
const DEFAULT_MAX_TOOLS = 20;
const HEXSTRIKE_DEBUG = process.env.HEXSTRIKE_DEBUG === "1";

const buildError = (status, message, extra = {}) => {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra);
  return error;
};

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeObjective = (value, fallback) => {
  const normalized = normalizeString(value).toLowerCase();
  if (["quick", "comprehensive", "stealth", "thorough"].includes(normalized)) {
    return normalized;
  }
  return fallback;
};

const toPositiveIntOr = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const logDebug = (...args) => {
  if (HEXSTRIKE_DEBUG) {
    console.log("[hexstrike]", ...args);
  }
};

const getTotalVulnerabilities = (scanPayload) => {
  const summaryCandidates = [
    scanPayload?.total_vulnerabilities,
    scanPayload?.summary?.total_vulnerabilities,
    scanPayload?.summary?.totalVulnerabilities,
    scanPayload?.stats?.total_vulnerabilities,
    scanPayload?.stats?.totalVulnerabilities,
  ];

  const total = summaryCandidates.find((candidate) => Number.isFinite(Number(candidate)));
  return total === undefined ? null : Number(total);
};

const collectToolEntries = (scanPayload) => {
  const candidates = [];

  const visit = (node) => {
    if (!node) {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (typeof node !== "object") {
      return;
    }

    const hasToolSignals =
      Object.prototype.hasOwnProperty.call(node, "command") ||
      Object.prototype.hasOwnProperty.call(node, "stdout") ||
      Object.prototype.hasOwnProperty.call(node, "stderr") ||
      Object.prototype.hasOwnProperty.call(node, "tool") ||
      Object.prototype.hasOwnProperty.call(node, "tool_name") ||
      Object.prototype.hasOwnProperty.call(node, "status") ||
      Object.prototype.hasOwnProperty.call(node, "success") ||
      Object.prototype.hasOwnProperty.call(node, "exit_code") ||
      Object.prototype.hasOwnProperty.call(node, "exitCode") ||
      Object.prototype.hasOwnProperty.call(node, "return_code") ||
      Object.prototype.hasOwnProperty.call(node, "returnCode") ||
      Object.prototype.hasOwnProperty.call(node, "code");

    if (hasToolSignals) {
      candidates.push(node);
    }

    Object.values(node).forEach(visit);
  };

  visit(scanPayload);

  return candidates;
};

const parseExitCode = (entry) => {
  const candidates = [
    entry?.exit_code,
    entry?.exitCode,
    entry?.return_code,
    entry?.returnCode,
    entry?.code,
  ];

  for (const value of candidates) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return null;
};

const hasTimeoutSignal = (entry) => {
  const status = normalizeString(entry?.status).toLowerCase();
  const stderr = normalizeString(entry?.stderr).toLowerCase();
  const merged = `${status}\n${stderr}`;

  return ["timeout", "timed out", "deadline exceeded"].some((token) => merged.includes(token));
};

const isEntryFailed = (entry) => {
  const status = normalizeString(entry?.status).toLowerCase();
  const exitCode = parseExitCode(entry);
  const hasPartialOutput =
    Boolean(entry?.partial_results) &&
    (normalizeString(entry?.stdout) !== "" || normalizeString(entry?.stderr) !== "");

  if (typeof entry?.success === "boolean" && entry.success === true) {
    return exitCode !== null && exitCode !== 0;
  }

  if (hasPartialOutput) {
    return false;
  }

  if (typeof entry?.success === "boolean" && entry.success === false) {
    return true;
  }

  if (exitCode !== null && exitCode !== 0) {
    return true;
  }

  if (hasTimeoutSignal(entry)) {
    return true;
  }

  if (status) {
    return ["failed", "error", "timeout", "unreachable"].some((token) => status.includes(token));
  }

  const stderr = normalizeString(entry?.stderr).toLowerCase();
  const stdout = normalizeString(entry?.stdout);

  return Boolean(stderr) && !stdout;
};

const isEntrySuccessful = (entry) => {
  const status = normalizeString(entry?.status).toLowerCase();
  const exitCode = parseExitCode(entry);
  const hasPartialOutput =
    Boolean(entry?.partial_results) &&
    (normalizeString(entry?.stdout) !== "" || normalizeString(entry?.stderr) !== "");

  if (typeof entry?.success === "boolean") {
    return entry.success === true && (exitCode === null || exitCode === 0);
  }

  if (hasPartialOutput) {
    return false;
  }

  if (exitCode !== null) {
    return exitCode === 0 && !hasTimeoutSignal(entry);
  }

  if (status) {
    return ["success", "completed", "ok"].some((token) => status.includes(token));
  }

  return false;
};

const hasEmptyExecutionOutput = (entry) => {
  const command = normalizeString(entry?.command);
  const stdout = normalizeString(entry?.stdout);
  const stderr = normalizeString(entry?.stderr);

  return !command && !stdout && !stderr;
};

const normalizeTargetForScanner = (rawTarget) => {
  const target = normalizeString(rawTarget);
  if (!target) {
    return "";
  }

  const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(target);
  const candidate = hasScheme ? target : `http://${target}`;

  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname) {
      return target;
    }

    const isWebProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";
    const hasPathOrQuery = /[/?]/.test(target);

    if (isWebProtocol && (hasScheme || hasPathOrQuery)) {
      const pathname = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
      const search = parsed.search || "";
      return `${parsed.origin}${pathname}${search}`;
    }

    return parsed.hostname;
  } catch (_error) {
    // Keep fallback behavior for non-URL scanner targets.
  }

  return target;
};

const checkHexStrikeConnection = async () => {
  const baseUrl = process.env.HEXSTRIKE_BASE_URL || DEFAULT_BASE_URL;
  const timeout = toPositiveIntOr(process.env.HEXSTRIKE_HEALTH_TIMEOUT_MS, 5000);
  const startedAt = Date.now();

  try {
    const response = await axios.get(baseUrl, {
      timeout,
      validateStatus: () => true,
    });

    return {
      ok: true,
      baseUrl,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      baseUrl,
      elapsedMs: Date.now() - startedAt,
      code: error?.code || null,
      message: error?.message || "Unable to connect to HexStrike",
    };
  }
};

const runHexStrikeScan = async (targetUrl, profileOverrides = null) => {
  const originalTarget = normalizeString(targetUrl);

  if (!originalTarget) {
    throw buildError(400, "targetUrl is required");
  }

  const target = normalizeTargetForScanner(originalTarget);

  const baseUrl = process.env.HEXSTRIKE_BASE_URL || DEFAULT_BASE_URL;
  const envTimeout = toPositiveIntOr(process.env.HEXSTRIKE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const envObjective = normalizeObjective(process.env.HEXSTRIKE_OBJECTIVE, DEFAULT_OBJECTIVE);
  const envMaxTools = toPositiveIntOr(process.env.HEXSTRIKE_MAX_TOOLS, DEFAULT_MAX_TOOLS);

  const timeout =
    Number.isFinite(Number(profileOverrides?.timeoutMs)) && Number(profileOverrides.timeoutMs) > 0
      ? Math.floor(Number(profileOverrides.timeoutMs))
      : envTimeout;
  const objective = normalizeObjective(profileOverrides?.objective, envObjective);
  const maxTools =
    Number.isFinite(Number(profileOverrides?.maxTools)) && Number(profileOverrides.maxTools) > 0
      ? Math.floor(Number(profileOverrides.maxTools))
      : envMaxTools;
  const hasProfileOverrides = Boolean(profileOverrides && typeof profileOverrides === "object");
  const allowTimeoutRetry =
    normalizeString(process.env.HEXSTRIKE_TIMEOUT_RETRY || "1") !== "0" && !hasProfileOverrides;
  const retryObjective = hasProfileOverrides
    ? objective
    : normalizeObjective(process.env.HEXSTRIKE_TIMEOUT_RETRY_OBJECTIVE, objective);
  const retryMaxTools = hasProfileOverrides
    ? maxTools
    : toPositiveIntOr(process.env.HEXSTRIKE_TIMEOUT_RETRY_MAX_TOOLS, maxTools);
  const retryTimeout = toPositiveIntOr(
    process.env.HEXSTRIKE_TIMEOUT_RETRY_TIMEOUT_MS,
    Math.min(timeout, 900000)
  );
  const startedAt = Date.now();

  logDebug("scan.start", {
    target: originalTarget,
    scannerTarget: target,
    baseUrl,
    timeout,
    objective,
    maxTools,
  });

  const executeScanRequest = async ({ requestObjective, requestMaxTools, requestTimeout }) => {
    return axios.post(
      `${baseUrl}/api/intelligence/smart-scan`,
      {
        target,
        objective: requestObjective,
        max_tools: requestMaxTools,
      },
      {
        timeout: requestTimeout,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  };

  let response;
  let usedFallbackProfile = false;
  try {
    response = await executeScanRequest({
      requestObjective: objective,
      requestMaxTools: maxTools,
      requestTimeout: timeout,
    });
  } catch (error) {
    const isTimeout = error?.code === "ECONNABORTED";

    if (isTimeout && allowTimeoutRetry) {
      logDebug("scan.retry", {
        target: originalTarget,
        scannerTarget: target,
        elapsedMs: Date.now() - startedAt,
        retryObjective,
        retryMaxTools,
        retryTimeout,
      });

      try {
        response = await executeScanRequest({
          requestObjective: retryObjective,
          requestMaxTools: retryMaxTools,
          requestTimeout: retryTimeout,
        });
        usedFallbackProfile = true;
      } catch (retryError) {
        const retryIsTimeout = retryError?.code === "ECONNABORTED";

        logDebug("scan.error", {
          target: originalTarget,
          scannerTarget: target,
          elapsedMs: Date.now() - startedAt,
          code: retryError?.code,
          message: retryError?.message,
          timeout: retryTimeout,
          retried: true,
        });

        throw buildError(502, "HexStrike scanner request failed", {
          scannerState: "failed",
          details:
            retryError?.response?.data ||
            (retryIsTimeout
              ? `Scanner request timed out after retry (${Number.isFinite(retryTimeout) ? retryTimeout : 240000}ms)`
              : retryError.message),
        });
      }

      if (!response) {
        throw error;
      }
    }

    if (!response) {
      logDebug("scan.error", {
        target: originalTarget,
        scannerTarget: target,
        elapsedMs: Date.now() - startedAt,
        code: error?.code,
        message: error?.message,
        timeout,
      });

      throw buildError(502, "HexStrike scanner request failed", {
        scannerState: "failed",
        details:
          error?.response?.data ||
          (isTimeout
            ? `Scanner request timed out after ${Number.isFinite(timeout) ? timeout : DEFAULT_TIMEOUT_MS}ms`
            : error.message),
      });
    }
  }

  const raw = response?.data || {};
  const scanResults = raw?.scan_results || raw;
  const totalVulnerabilities = getTotalVulnerabilities(scanResults);
  const toolEntries = collectToolEntries(scanResults);

  const failedTools = toolEntries.filter(isEntryFailed).length;
  const successfulTools = toolEntries.filter(isEntrySuccessful).length;
  const timedOutTools = toolEntries.filter(hasTimeoutSignal).length;
  const failureRatio = toolEntries.length > 0 ? failedTools / toolEntries.length : 0;

  const allToolsFailed = toolEntries.length > 0 && failedTools === toolEntries.length;
  const emptyToolOutput = toolEntries.length > 0 && toolEntries.every(hasEmptyExecutionOutput);

  const findingsCount = Array.isArray(scanResults?.findings) ? scanResults.findings.length : 0;
  const hasAnySignals =
    (totalVulnerabilities !== null && totalVulnerabilities > 0) || findingsCount > 0;

  const unusableReasons = [];
  const warningReasons = [];

  if (totalVulnerabilities === 0 && successfulTools === 0) {
    unusableReasons.push("total_vulnerabilities=0");
  }
  if (allToolsFailed && !hasAnySignals) {
    unusableReasons.push("all_tools_failed");
  }
  if (emptyToolOutput && !hasAnySignals) {
    unusableReasons.push("empty_tool_output");
  }

  if (toolEntries.length >= 3 && failureRatio >= 0.5) {
    warningReasons.push("too_many_tool_failures");
  }
  if (timedOutTools > 0) {
    warningReasons.push("tool_timeouts_detected");
  }

  const scannerState =
    unusableReasons.length > 0
      ? "scanner_unusable"
      : warningReasons.length > 0 || (hasAnySignals && failedTools > 0)
        ? "completed_with_warnings"
        : "completed";

  logDebug("scan.done", {
    target: originalTarget,
    scannerTarget: target,
    elapsedMs: Date.now() - startedAt,
    scannerState,
    toolsInspected: toolEntries.length,
    successfulTools,
    failedTools,
    timedOutTools,
  });


  // Extract target profile metadata from the Python engine's analysis
  const targetProfile = scanResults?.target_profile || null;

  return {
    target: originalTarget,
    scannerState,
    scanResults,
    findings: scanResults.findings || [],
    targetProfile,
    metadata: {
      scannerTarget: target,
      usedFallbackProfile,
      profile: usedFallbackProfile
        ? { objective: retryObjective, maxTools: retryMaxTools, timeout: retryTimeout }
        : { objective, maxTools, timeout },
      totalVulnerabilities,
      toolsInspected: toolEntries.length,
      allToolsFailed,
      failedTools,
      successfulTools,
      timedOutTools,
      failureRatio,
      emptyToolOutput,
      unusableReasons,
      warningReasons,
      objective,
      maxTools,
      findingsCount,
    },
  };
};
exports.runHexStrikeScan = runHexStrikeScan;
// Backward-compatible alias to avoid breaking older call sites.
exports.scanTarget = runHexStrikeScan;
exports.checkHexStrikeConnection = checkHexStrikeConnection;
