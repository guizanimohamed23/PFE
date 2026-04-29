/**
 * End-to-end pipeline diagnostic.
 * Simulates exactly what scanService.create() does with the passive findings,
 * running them through vulnerabilityMatcherService.createOrMatchFindings().
 */
const axios = require("axios");

const PASSIVE_TIMEOUT_MS = 12000;
const PASSIVE_REQUEST_HEADERS = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"Accept-Language": "en-US,en;q=0.5",
	"Connection": "keep-alive",
};

// Replicate buildPassiveFindings exactly as in scanService.js
const buildPassiveFindings = async (targetUrl) => {
	const findings = [];

	let rootResponse;
	try {
		rootResponse = await axios.get(targetUrl, {
			timeout: PASSIVE_TIMEOUT_MS,
			validateStatus: () => true,
			maxRedirects: 5,
			headers: PASSIVE_REQUEST_HEADERS,
		});
	} catch (err) {
		console.log(`  ❌ HTTP request FAILED: ${err.code} - ${err.message}`);
		return findings;
	}

	console.log(`  ✅ HTTP ${rootResponse.status}`);

	if (Number(rootResponse.status) >= 500) {
		findings.push({
			cveId: null,
			title: "Target Application Instability (5xx)",
			description: `HTTP ${rootResponse.status}`,
			severity: "medium",
			evidence: `Target: ${targetUrl}\nHTTP Status: ${rootResponse.status}`,
		});
	}

	const headers = Object.fromEntries(
		Object.entries(rootResponse.headers || {}).map(([k, v]) => [String(k).toLowerCase(), String(v || "")])
	);

	// Missing headers
	const missingHeaderFindings = [
		{ header: "content-security-policy", title: "Missing Content Security Policy (CSP)", description: "Response does not include a CSP header, increasing XSS impact risk.", severity: "medium" },
		{ header: "strict-transport-security", title: "Missing Strict-Transport-Security (HSTS)", description: "Response is missing HSTS header.", severity: "medium", condition: (url) => url.startsWith("https://") },
		{ header: "x-content-type-options", title: "Missing X-Content-Type-Options", description: "Response is missing X-Content-Type-Options: nosniff.", severity: "low" },
		{ header: "x-frame-options", title: "Missing X-Frame-Options", description: "Response is missing clickjacking protection.", severity: "low" },
		{ header: "referrer-policy", title: "Missing Referrer-Policy", description: "Response is missing Referrer-Policy header.", severity: "low" },
		{ header: "permissions-policy", title: "Missing Permissions-Policy", description: "Response is missing Permissions-Policy header.", severity: "low" },
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

	// Cookie security
	const rawSetCookie = headers["set-cookie"] || "";
	if (rawSetCookie) {
		const cookieParts = rawSetCookie.toLowerCase();
		if (!cookieParts.includes("secure")) {
			findings.push({ cveId: null, title: "Cookie Missing Secure Flag", description: "Missing Secure flag.", severity: "medium", evidence: `Target: ${targetUrl}` });
		}
		if (!cookieParts.includes("samesite")) {
			findings.push({ cveId: null, title: "Cookie Missing SameSite Attribute", description: "Missing SameSite.", severity: "low", evidence: `Target: ${targetUrl}` });
		}
	}

	// Insecure transport
	if (targetUrl.startsWith("http://")) {
		findings.push({ cveId: null, title: "Insecure Transport (HTTP)", description: "HTTP in use.", severity: "medium", evidence: `Target: ${targetUrl}` });
	}

	// Server header
	const serverHeader = headers["server"] || "";
	if (serverHeader) {
		findings.push({ cveId: null, title: "Server Header Information Disclosure", description: `Server: ${serverHeader}`, severity: "info", evidence: `Server: ${serverHeader}` });
	}

	// Framework fingerprinting
	const poweredBy = headers["x-powered-by"] || "";
	const cookies = rawSetCookie;
	const frameworkRules = [
		{ name: "Java/Tomcat", hint: cookies.includes("JSESSIONID") || serverHeader.includes("Apache-Coyote") || serverHeader.includes("Tomcat") },
		{ name: "Express/Node.js", hint: poweredBy.includes("Express") || cookies.includes("connect.sid") },
		{ name: "PHP", hint: poweredBy.includes("PHP") || cookies.includes("PHPSESSID") },
	];

	// Body fingerprinting
	const body = String(rootResponse.data || "");
	const bodyLower = body.slice(0, 30000).toLowerCase();
	const bodyFrameworkRules = [
		{ name: "Angular SPA", hint: ["ng-version", "<app-root", "polyfills.js", "runtime.js", "main.js", "@angular", "ngsw-worker.js"].some(s => bodyLower.includes(s)) },
		{ name: "React SPA", hint: ["data-reactroot", "react-dom", "__react_devtools"].some(s => bodyLower.includes(s)) },
		{ name: "PHP", hint: !poweredBy.includes("PHP") && !cookies.includes("PHPSESSID") && [".php", "phpmyadmin"].some(s => bodyLower.includes(s)) },
		{ name: "jQuery", hint: ["jquery.min.js", "jquery.js"].some(s => bodyLower.includes(s)) },
		{ name: "SPA", hint: body.length < 5000 && (bodyLower.match(/src=["'][^"']*\.js["']/g) || []).length >= 3 },
	];

	for (const rule of [...frameworkRules, ...bodyFrameworkRules]) {
		if (rule.hint) {
			findings.push({ cveId: null, title: `Technology Detected: ${rule.name}`, description: `Target running ${rule.name}.`, severity: "info", evidence: `Match: ${rule.name}` });
		}
	}

	return findings;
};

(async () => {
	const targets = [
		"https://demo.owasp-juice.shop/",
		"http://testphp.vulnweb.com/",
		"http://altoro.testfire.net/",
	];

	for (const target of targets) {
		console.log(`\n${"=".repeat(60)}`);
		console.log(`TARGET: ${target}`);
		console.log("=".repeat(60));

		const findings = await buildPassiveFindings(target);
		console.log(`\n  📊 TOTAL PASSIVE FINDINGS: ${findings.length}`);
		for (const f of findings) {
			console.log(`    [${f.severity.toUpperCase().padEnd(8)}] ${f.title}`);
		}

		if (findings.length === 0) {
			console.log(`  ⚠️  NO FINDINGS GENERATED — this is the bug!`);
		}
	}
})();
