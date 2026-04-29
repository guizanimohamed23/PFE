const prisma = require("../config/db");
const hexstrikeService = require("./hexstrikeService");
const scanNormalizationService = require("./scanNormalizationService");
const vulnerabilityMatcherService = require("./vulnerabilityMatcherService");
const dns = require("dns").promises;
const net = require("net");
const axios = require("axios");

const ALLOW_LOCAL_SCAN = String(process.env.HEXSTRIKE_ALLOW_LOCAL_SCAN || "0") === "1";

const inFlightScans = new Map();

const includeScanShape = {
	results: {
		include: {
			vulnerability: true,
		},
	},
};

const buildError = (status, message) => {
	const error = new Error(message);
	error.status = status;
	return error;
};

const PROFILE_PRESETS = {
	global:   { objective: "comprehensive", maxTools: 20, timeoutMs: 1800000 },
	balanced: { objective: "comprehensive", maxTools: 12, timeoutMs: 1200000 },
	quick:    { objective: "quick",         maxTools: 5,  timeoutMs: 900000  },
};

const sanitizeProfileOverrides = (payloadProfile) => {
	if (!payloadProfile || typeof payloadProfile !== "object") {
		return null;
	}

	const mode = String(payloadProfile.mode || "").trim().toLowerCase();
	if (mode && PROFILE_PRESETS[mode]) {
		return {
			mode,
			...PROFILE_PRESETS[mode],
		};
	}

	const objective = String(payloadProfile.objective || "").trim().toLowerCase();
	const maxToolsRaw = Number(payloadProfile.maxTools);
	const timeoutMsRaw = Number(payloadProfile.timeoutMs);

	const maxTools = Number.isFinite(maxToolsRaw) && maxToolsRaw > 0 ? Math.floor(maxToolsRaw) : undefined;
	const timeoutMs = Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 0 ? Math.floor(timeoutMsRaw) : undefined;

	if (!objective && !maxTools && !timeoutMs) {
		return null;
	}

	return {
		mode: "custom",
		objective: objective || undefined,
		maxTools,
		timeoutMs,
	};
};

// ── SSRF Protection ─────────────────────────────────────────────
const BLOCKED_IP_RANGES = [
	/^127\./,                            // IPv4 loopback
	/^0\./,                              // "this" network
	/^10\./,                             // RFC1918 Class A private
	/^172\.(1[6-9]|2[0-9]|3[0-1])\./,   // RFC1918 Class B private
	/^192\.168\./,                       // RFC1918 Class C private
	/^169\.254\./,                       // link-local / AWS metadata
	/^100\.(6[4-9]|[7-9]\d|1[0-2]\d)\./, // CGNAT (100.64/10)
	/^::1$/,                             // IPv6 loopback
	/^fc00:/i,                           // IPv6 ULA
	/^fe80:/i,                           // IPv6 link-local
];

const isBlockedIp = (ip) => BLOCKED_IP_RANGES.some((re) => re.test(ip));

const validateTargetUrl = async (urlString) => {
	let parsed;
	try {
		parsed = new URL(urlString);
	} catch {
		throw buildError(400, "targetUrl is not a valid URL");
	}

	if (!["http:", "https:"].includes(parsed.protocol)) {
		throw buildError(400, "targetUrl must use http or https protocol");
	}

	const hostname = parsed.hostname;

	if ((hostname === "localhost" || hostname === "") && !ALLOW_LOCAL_SCAN) {
		throw buildError(400, "Scanning localhost is not allowed");
	}

	// Direct IP check
	if (net.isIP(hostname)) {
		if (isBlockedIp(hostname) && !ALLOW_LOCAL_SCAN) {
			throw buildError(400, "targetUrl points to a private/reserved IP address");
		}
		return;
	}

	if (ALLOW_LOCAL_SCAN && (hostname === "localhost" || isBlockedIp(hostname))) {
		return;
	}

	// DNS resolution check
	try {
		const addresses = await dns.lookup(hostname, { all: true });
		for (const { address } of addresses) {
			if (isBlockedIp(address) && !ALLOW_LOCAL_SCAN) {
				throw buildError(400, `targetUrl hostname '${hostname}' resolves to a private/reserved IP (${address})`);
			}
		}
	} catch (err) {
		if (err.status) throw err;
		throw buildError(400, `Cannot resolve hostname: ${hostname}`);
	}
};

// ── Helpers ─────────────────────────────────────────────────────
const toScanKey = (targetUrl) => String(targetUrl || "").trim().toLowerCase();

const PASSIVE_TIMEOUT_MS = 12000;

// Browser-like headers to avoid bot-protection rejections (Cloudflare, WAFs, etc.)
const PASSIVE_REQUEST_HEADERS = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"Accept-Language": "en-US,en;q=0.5",
	"Accept-Encoding": "gzip, deflate, br",
	"Connection": "keep-alive",
	"Upgrade-Insecure-Requests": "1",
};

/**
 * Fetch a URL with retry on transient network errors.
 * Returns the axios response or throws on final failure.
 */
const fetchWithRetry = async (url, options, maxRetries = 2) => {
	let lastError;
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await axios.get(url, options);
		} catch (err) {
			lastError = err;
			// Only retry on network-level errors (ECONNRESET, ETIMEDOUT, etc.)
			const isRetryable = err.code && /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/.test(err.code);
			if (!isRetryable || attempt === maxRetries) break;
			await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
		}
	}
	throw lastError;
};

const buildPassiveFindings = async (targetUrl) => {
	const findings = [];

	let rootResponse;
	try {
		rootResponse = await fetchWithRetry(targetUrl, {
			timeout: PASSIVE_TIMEOUT_MS,
			validateStatus: () => true,
			maxRedirects: 5,
			headers: PASSIVE_REQUEST_HEADERS,
		});
	} catch (_error) {
		return findings;
	}

	// If the server is returning 5xx errors, flag it as a finding but continue
	// analysing whatever headers/body we did receive — don't bail out entirely.
	if (Number(rootResponse.status) >= 500) {
		findings.push({
			cveId: null,
			title: "Target Application Instability (5xx)",
			description: `The application returned HTTP ${rootResponse.status} during passive analysis, indicating server-side errors or misconfigurations that may expose internal details.`,
			severity: "medium",
			evidence: `Target: ${targetUrl}\nHTTP Status: ${rootResponse.status}`,
		});
		// Still continue — headers are still worth inspecting even on 5xx
	}

	const headers = Object.fromEntries(
		Object.entries(rootResponse.headers || {}).map(([k, v]) => [String(k).toLowerCase(), String(v || "")])
	);

	const missingHeaderFindings = [
		{
			header: "content-security-policy",
			title: "Missing Content Security Policy (CSP)",
			description: "Response does not include a CSP header, increasing XSS impact risk.",
			severity: "medium",
		},
		{
			header: "strict-transport-security",
			title: "Missing Strict-Transport-Security (HSTS)",
			description: "Response is missing HSTS header. Browsers will not enforce HTTPS, enabling downgrade attacks.",
			severity: "medium",
			condition: (targetUrl) => targetUrl.startsWith("https://"),
		},
		{
			header: "x-content-type-options",
			title: "Missing X-Content-Type-Options",
			description: "Response is missing X-Content-Type-Options: nosniff.",
			severity: "low",
		},
		{
			header: "x-frame-options",
			title: "Missing X-Frame-Options",
			description: "Response is missing clickjacking protection header X-Frame-Options.",
			severity: "low",
		},
		{
			header: "referrer-policy",
			title: "Missing Referrer-Policy",
			description: "Response is missing Referrer-Policy header, which can leak URL data.",
			severity: "low",
		},
		{
			header: "permissions-policy",
			title: "Missing Permissions-Policy",
			description: "Response is missing Permissions-Policy header, allowing unrestricted access to browser features like camera, microphone, and geolocation.",
			severity: "low",
		},
	];

	for (const rule of missingHeaderFindings) {
		if (rule.condition && !rule.condition(targetUrl)) continue;
		if (!headers[rule.header]) {
			findings.push({
				cveId: null,
				title: rule.title,
				description: rule.description,
				severity: rule.severity,
				evidence: `Target: ${targetUrl}\nMissing header: ${rule.header}`,
			});
		}
	}

	// ── Cookie Security ──────────────────────────────────────────
	const rawSetCookie = headers["set-cookie"] || "";
	if (rawSetCookie) {
		const cookieParts = rawSetCookie.toLowerCase();
		if (!cookieParts.includes("secure")) {
			findings.push({
				cveId: null,
				title: "Cookie Missing Secure Flag",
				description: "A Set-Cookie header is missing the Secure flag, allowing the cookie to be sent over unencrypted HTTP.",
				severity: "medium",
				evidence: `Target: ${targetUrl}\nSet-Cookie header lacks 'Secure' attribute`,
			});
		}
		if (!cookieParts.includes("samesite")) {
			findings.push({
				cveId: null,
				title: "Cookie Missing SameSite Attribute",
				description: "A Set-Cookie header is missing the SameSite attribute, potentially enabling CSRF attacks.",
				severity: "low",
				evidence: `Target: ${targetUrl}\nSet-Cookie header lacks 'SameSite' attribute`,
			});
		}
	}

	// ── Insecure Transport ─────────────────────────────────────────
	if (targetUrl.startsWith("http://") && !ALLOW_LOCAL_SCAN && !isBlockedIp(new URL(targetUrl).hostname)) {
		findings.push({
			cveId: null,
			title: "Insecure Transport (HTTP)",
			description: "The application allows unencrypted HTTP connections, transmitting all data (including credentials and session cookies) in cleartext over the network.",
			severity: "medium",
			evidence: `Target URL: ${targetUrl}`,
		});
	}

	// ── Server Header Information Disclosure ─────────────────────
	const serverHeader = headers["server"] || "";
	if (serverHeader && serverHeader !== "") {
		findings.push({
			cveId: null,
			title: "Server Header Information Disclosure",
			description: "The Server header reveals technology and version info that helps attackers fingerprint the stack.",
			severity: "info",
			evidence: `Target: ${targetUrl}\nServer: ${serverHeader}`,
		});
	}

	// ── Framework Fingerprinting ──────────────────────────────────
	const poweredBy = headers["x-powered-by"] || "";
	const cookies = rawSetCookie;

	const frameworkRules = [
		{ name: "Java/Tomcat", hint: cookies.includes("JSESSIONID") || serverHeader.includes("Apache-Coyote") || serverHeader.includes("Tomcat") },
		{ name: "Laravel", hint: poweredBy.includes("Laravel") || cookies.includes("laravel_session") },
		{ name: "Django", hint: cookies.includes("csrftoken") },
		{ name: "Express/Node.js", hint: poweredBy.includes("Express") || cookies.includes("connect.sid") },
		{ name: "PHP", hint: poweredBy.includes("PHP") || cookies.includes("PHPSESSID") },
		{ name: "ASP.NET", hint: poweredBy.includes("ASP.NET") || cookies.includes("ASP.NET_SessionId") },
		{ name: "Ruby on Rails", hint: cookies.includes("_session_id") && poweredBy.includes("Phusion") },
	];

	// ── Body-Content Framework & SPA Fingerprinting ───────────────
	const body = String(rootResponse.data || "");
	const bodyLower = body.slice(0, 30000).toLowerCase();

	const bodyFrameworkRules = [
		{
			name: "React SPA",
			hint: ["data-reactroot", "react-dom", "__react_devtools", "_reactfiber", "window.__reactroot", "/static/js/main.", "react.production.min.js"]
				.some((sig) => bodyLower.includes(sig)),
		},
		{
			name: "Angular SPA",
			// Angular bundles: main.*.js, polyfills.*.js, runtime.*.js  or ng-version attr
			hint: ["ng-version", "ng-app", "<app-root", "[_nghost", "angular.min.js",
					"polyfills.js", "runtime.js", "main.js", ".chunk.js",
					"angular/core", "@angular", "ngsw-worker.js"]
				.some((sig) => bodyLower.includes(sig)),
		},
		{
			name: "Vue.js SPA",
			hint: ["__vue__", "data-v-", "vue.min.js", "vue.js", "vue.runtime"]
				.some((sig) => bodyLower.includes(sig)),
		},
		{
			name: "PHP",
			hint: !poweredBy.includes("PHP") && !cookies.includes("PHPSESSID") &&
				["<?php", ".php", "phpmyadmin", "phpinfo"]
					.some((sig) => bodyLower.includes(sig)),
		},
		{
			name: "WordPress",
			hint: ["wp-content", "wp-includes", "wordpress"]
				.some((sig) => bodyLower.includes(sig)),
		},
		{
			name: "jQuery",
			hint: ["jquery.min.js", "jquery.js", "jquery-"].some((sig) => bodyLower.includes(sig)),
		},
		{
			// Detect general SPA shell even without a specific framework signal
			name: "Single-Page Application (SPA)",
			hint:
				// SPA shells: small HTML, lots of JS bundles, no meaningful server-rendered text
				body.length < 5000 &&
				(bodyLower.match(/src=["'][^"']*\.js["']/g) || []).length >= 3 &&
				!bodyLower.includes("<p ") && !bodyLower.includes("<table"),
		},
	];

	for (const rule of [...frameworkRules, ...bodyFrameworkRules]) {
		if (rule.hint) {
			findings.push({
				cveId: null,
				title: `Technology Detected: ${rule.name}`,
				description: `Target identified as running ${rule.name}. Analysts should prioritize platform-specific vulnerabilities.`,
				severity: "info",
				evidence: `Source: Headers/Cookies/Body Matching "${rule.name}"`,
			});
		}
	}

	// ── Secret Scanning ───────────────────────────────────────────
	// (body is already defined above)
	const secretPatterns = [
		{ name: "AWS API Key", regex: /AKIA[0-9A-Z]{16}/g, severity: "high" },
		// Stricter: AWS secret keys are base64-like strings that appear adjacent to known key identifiers
		{ name: "AWS Secret Key", regex: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY|SecretAccessKey)['":\s=]+(['"]?)([A-Za-z0-9/+]{40})\1/g, severity: "high", captureGroup: 2 },
		{ name: "Generic API Key", regex: /api[-_]?key[:=]\s*['"]([a-zA-Z0-9]{24,})['"]/gi, severity: "medium" },
		{ name: "RSA Private Key", regex: /-----BEGIN RSA PRIVATE KEY-----/g, severity: "critical" },
		{ name: "SSH Private Key", regex: /-----BEGIN OPENSSH PRIVATE KEY-----/g, severity: "critical" },
		{ name: "Generic Secret", regex: /(?:secret|password|passwd|token|credential)['"\s]*[:=]\s*['"]([a-zA-Z0-9!@#$%^&*()_+\-=]{12,})['"]/gi, severity: "medium" },
	];

	for (const pattern of secretPatterns) {
		let execMatch;
		let count = 0;
		const reWithGlobal = new RegExp(pattern.regex.source, pattern.regex.flags.includes("g") ? pattern.regex.flags : `${pattern.regex.flags}g`);
		while ((execMatch = reWithGlobal.exec(body)) !== null && count < 3) {
			const displayValue = pattern.captureGroup
				? (execMatch[pattern.captureGroup] || execMatch[0])
				: execMatch[0];
			if (pattern.filter && !pattern.filter(displayValue)) continue;
			count++;
			findings.push({
				cveId: "OWASP-2021-A02-HARDCODED-SECRET",
				title: `Potentially Exposed ${pattern.name}`,
				description: `Discovery of a string matching a common ${pattern.name} pattern in the page body.`,
				severity: pattern.severity,
				evidence: `Pattern match: ${displayValue.substring(0, 8)}... [redacted]`,
			});
		}
	}

	const base = new URL(targetUrl);
	const probePaths = [
		"/api", "/api-docs", "/swagger", "/openapi.json", "/robots.txt",
		"/.env", "/.git/config", "/package.json", "/composer.json"
	];

	// Run all probes in parallel with a short per-probe timeout (4s) to avoid
	// blocking the passive scan for 100+ seconds on slow targets.
	const PROBE_TIMEOUT_MS = 4000;
	const probePromises = probePaths.map(async (path) => {
		try {
			const probeUrl = `${base.origin}${path}`;
			const response = await axios.get(probeUrl, {
				timeout: PROBE_TIMEOUT_MS,
				validateStatus: () => true,
				maxRedirects: 2,
				headers: PASSIVE_REQUEST_HEADERS,
			});

			if (response.status >= 200 && response.status < 300) {
				const isExtremelySensitive = [".env", ".git/config"].some(p => path.includes(p));
				findings.push({
					cveId: isExtremelySensitive ? "OWASP-2021-A05-DIR-LISTING" : null,
					title: `Exposed Endpoint / File: ${path}`,
					description: `Publicly accessible ${path === "/robots.txt" ? "manifest" : "endpoint/config"} discovered during assessment.`,
					severity: isExtremelySensitive ? "high" : (path === "/api-docs" || path === "/openapi.json" ? "medium" : "low"),
					evidence: `Discovered ${probeUrl} (HTTP ${response.status})`,
				});
			}
		} catch (_error) {
			// Ignore probe failures
		}
	});
	await Promise.allSettled(probePromises);

	return findings;
};

const toScanResponse = (scan, options = {}) => {
	if (!scan) {
		return scan;
	}

	const matchedFindings = Array.isArray(scan.results) ? scan.results.length : 0;
	const fallbackState = "completed";
	const defaultNormalization = {
		rawToolFindings: 0,
		rawGenericFindings: 0,
		rawTotalFindings: matchedFindings,
		dedupedFindings: matchedFindings,
		filteredFindings: matchedFindings,
		droppedFindings: 0,
	};
	const defaultScanner = {
		totalVulnerabilities: null,
		toolsInspected: 0,
		toolsUsed: [],
		skippedTools: [],
		allToolsFailed: false,
		emptyToolOutput: false,
		unusableReasons: [],
	};

	const scanMeta = options.scanMeta || (scan.metadata && typeof scan.metadata === 'object' && Object.keys(scan.metadata).length > 0 ? scan.metadata : null) || {
		totalFindings: matchedFindings,
		matchedFindings,
		unmatchedFindings: 0,
		scanner: defaultScanner,
		normalization: defaultNormalization,
	};

	return {
		...scan,
		scanState: options.scanState || scan.scanState || fallbackState,
		scanMeta,
		targetProfile: options.targetProfile || null,
		unmatchedFindings: options.unmatchedFindings || scan.unmatchedFindings || [],
	};
};

// ── Service Methods ─────────────────────────────────────────────
exports.getAll = async (userId, { page = 1, limit = 20 } = {}) => {
	const skip = (Math.max(1, page) - 1) * limit;
	const where = userId ? { userId } : {};

	const [total, scans] = await Promise.all([
		prisma.scan.count({ where }),
		prisma.scan.findMany({
			where,
			orderBy: { id: "desc" },
			skip,
			take: limit,
			include: includeScanShape,
		}),
	]);

	return {
		data: scans.map((scan) => toScanResponse(scan)),
		meta: {
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit),
		},
	};
};

exports.getById = async (id, userId) => {
	const where = userId ? { id, userId } : { id };
	const scan = await prisma.scan.findFirst({
		where,
		include: includeScanShape,
	});

	return toScanResponse(scan);
};

exports.create = async (payload, userId) => {
	const targetUrl = payload?.targetUrl;
	const profileOverrides = sanitizeProfileOverrides(payload?.scanProfile);

	if (!targetUrl || typeof targetUrl !== "string") {
		throw buildError(400, "targetUrl is required");
	}

	// SSRF protection: block private/reserved IP ranges
	await validateTargetUrl(targetUrl);

	const scanKey = toScanKey(targetUrl);
	const existingPromise = inFlightScans.get(scanKey);
	if (existingPromise) {
		return existingPromise;
	}

	const scanPromise = (async () => {
		let scannerOutput;
		try {
			scannerOutput = await hexstrikeService.runHexStrikeScan(targetUrl, profileOverrides);
		} catch (error) {
			const timeoutText = `${error?.details || ""}\n${error?.message || ""}`.toLowerCase();
			const timedOut =
				error?.scannerState === "failed" &&
				(timeoutText.includes("timed out") || timeoutText.includes("timeout"));

			if (timedOut) {
				const persistedScan = await prisma.scan.create({
					data: { targetUrl, userId: userId || null },
				});

				const loadedScan = await prisma.scan.findUnique({
					where: { id: persistedScan.id },
					include: includeScanShape,
				});

				return toScanResponse(loadedScan, {
					scanState: "scanner_unusable",
					scanMeta: {
						totalFindings: 0,
						matchedFindings: 0,
						unmatchedFindings: 0,
						scannerOutcome: "failed",
						scanner: {
							totalVulnerabilities: null,
							toolsInspected: 0,
							toolsUsed: [],
							skippedTools: [],
							allToolsFailed: false,
							emptyToolOutput: true,
							unusableReasons: ["scanner_request_timeout"],
							details: error?.details || "Scanner request timed out",
						},
						normalization: {
							rawToolFindings: 0,
							rawGenericFindings: 0,
							rawTotalFindings: 0,
							dedupedFindings: 0,
							filteredFindings: 0,
							droppedFindings: 0,
						},
					},
					unmatchedFindings: [],
				});
			}

			if (error.status) {
				throw error;
			}
			const wrappedError = buildError(502, "Scanner execution failed");
			wrappedError.scannerState = "failed";
			throw wrappedError;
		}

		const normalization = scanNormalizationService.normalizeHexstrikeResultsDetailed(scannerOutput);
		const normalizedFindings = normalization.findings;

		let passiveFindings = [];
		try {
			passiveFindings = await buildPassiveFindings(targetUrl);
			console.log(`[SCAN-PIPELINE] ✅ buildPassiveFindings returned ${passiveFindings.length} items for ${targetUrl}`);
		} catch (passiveError) {
			console.error(`[SCAN-PIPELINE] ❌ buildPassiveFindings failed:`, passiveError.message);
		}

		const combinedFindings = [...normalizedFindings, ...passiveFindings];
		const allResults = await vulnerabilityMatcherService.createOrMatchFindings(combinedFindings);

		const matchedCount = allResults.length;
		const createdCount = allResults.filter((r) => r.matchedBy === "created").length;
		const matchedExistingCount = allResults.filter((r) => r.matchedBy === "cveId" || r.matchedBy === "keyword").length;
		
		const isScannerUnusable = scannerOutput.scannerState === "scanner_unusable";
		const scannerOutcome = (matchedCount > 0) ? "completed" : (isScannerUnusable ? "failed" : "completed_with_warnings");
		const resolvedScanState = isScannerUnusable ? "scanner_unusable" : "completed";

		const scanMeta = {
			totalFindings: combinedFindings.length,
			matchedFindings: allResults.length,
			unmatchedFindings: 0,
			newVulnerabilitiesCreated: createdCount,
			matchedExistingFindings: matchedExistingCount,
			scannerOutcome,
			scanner: {
				...scannerOutput.metadata,
				toolsUsed: 
					scannerOutput?.scanResults?.execution_summary?.tools_used || 
					scannerOutput?.scanResults?.tools_executed?.map(t => t.tool || t.tool_name).filter(Boolean) || 
					[],
				skippedTools: scannerOutput?.scanResults?.skipped_tools || [],
				toolsInspected: 
					scannerOutput?.metadata?.toolsInspected || 
					scannerOutput?.scanResults?.execution_summary?.total_tools ||
					(scannerOutput?.scanResults?.tools_executed?.length) ||
					0,
			},
			normalization: {
				...normalization,
				passiveFindings: passiveFindings.length,
			},
		};

		const persistedScan = await prisma.$transaction(async (tx) => {
			const scan = await tx.scan.create({
				data: { 
					targetUrl, 
					userId: userId || null,
					metadata: scanMeta
				},
			});

			if (!isScannerUnusable) {
				await tx.scanResult.createMany({
					data: allResults.map((result) => ({
						scanId: scan.id,
						vulnerabilityId: result.vulnerabilityId,
						evidence: result.evidence,
					})),
				});
			}

			return tx.scan.findUnique({
				where: { id: scan.id },
				include: includeScanShape,
			});
		});

		return toScanResponse(persistedScan, {
			scanState: resolvedScanState,
			scanMeta,
			targetProfile: scannerOutput.targetProfile || null,
			unmatchedFindings: [],
		});
	})();

	inFlightScans.set(scanKey, scanPromise);
	try {
		return await scanPromise;
	} finally {
		if (inFlightScans.get(scanKey) === scanPromise) {
			inFlightScans.delete(scanKey);
		}
	}
};
