/**
 * Diagnostic: Test what buildPassiveFindings actually returns for each target.
 * This isolates the Node.js passive scan from the full pipeline.
 */
const axios = require("axios");

const PASSIVE_TIMEOUT_MS = 12000;

const PASSIVE_REQUEST_HEADERS = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
	"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
	"Accept-Language": "en-US,en;q=0.5",
	"Accept-Encoding": "gzip, deflate, br",
	"Connection": "keep-alive",
	"Upgrade-Insecure-Requests": "1",
};

const targets = [
	"https://demo.owasp-juice.shop/",
	"http://testphp.vulnweb.com/",
	"http://altoro.testfire.net/",
];

async function testTarget(targetUrl) {
	console.log(`\n${"=".repeat(70)}`);
	console.log(`TARGET: ${targetUrl}`);
	console.log("=".repeat(70));

	// Step 1: Can we even reach it?
	let rootResponse;
	try {
		rootResponse = await axios.get(targetUrl, {
			timeout: PASSIVE_TIMEOUT_MS,
			validateStatus: () => true,
			maxRedirects: 5,
			headers: PASSIVE_REQUEST_HEADERS,
		});
		console.log(`✅ HTTP ${rootResponse.status} — ${rootResponse.statusText}`);
	} catch (err) {
		console.log(`❌ REQUEST FAILED: ${err.code || err.message}`);
		console.log(`   Full error: ${err.message}`);
		return;
	}

	// Step 2: What headers did we get?
	const headers = Object.fromEntries(
		Object.entries(rootResponse.headers || {}).map(([k, v]) => [String(k).toLowerCase(), String(v || "")])
	);
	console.log(`\n── Response Headers ──`);
	const interestingHeaders = [
		"server", "x-powered-by", "set-cookie",
		"content-security-policy", "strict-transport-security",
		"x-frame-options", "x-content-type-options",
		"referrer-policy", "permissions-policy", "content-type",
	];
	for (const h of interestingHeaders) {
		const val = headers[h];
		if (val) {
			console.log(`  ${h}: ${val.substring(0, 120)}`);
		} else {
			console.log(`  ${h}: ❌ MISSING`);
		}
	}

	// Step 3: Body analysis
	const body = String(rootResponse.data || "");
	const bodyLower = body.slice(0, 30000).toLowerCase();
	console.log(`\n── Body Analysis ──`);
	console.log(`  Body length: ${body.length} chars`);
	console.log(`  First 500 chars: ${body.substring(0, 500).replace(/\n/g, "\\n")}`);

	// SPA signals
	const spaSignals = {
		"React: data-reactroot": bodyLower.includes("data-reactroot"),
		"React: react-dom": bodyLower.includes("react-dom"),
		"Angular: ng-version": bodyLower.includes("ng-version"),
		"Angular: <app-root": bodyLower.includes("<app-root"),
		"Angular: polyfills.js": bodyLower.includes("polyfills.js"),
		"Angular: runtime.js": bodyLower.includes("runtime.js"),
		"Angular: main.js": bodyLower.includes("main.js"),
		"Angular: .chunk.js": bodyLower.includes(".chunk.js"),
		"Angular: @angular": bodyLower.includes("@angular"),
		"Vue: __vue__": bodyLower.includes("__vue__"),
		"Vue: data-v-": bodyLower.includes("data-v-"),
		"PHP: .php": bodyLower.includes(".php"),
		"PHP: PHPSESSID (cookie)": (headers["set-cookie"] || "").toLowerCase().includes("phpsessid"),
		"jQuery": bodyLower.includes("jquery"),
		"SPA shell (<script count)": (bodyLower.match(/src=["'][^"']*\.js["']/g) || []).length,
	};
	console.log(`\n── SPA / Framework Signals ──`);
	for (const [sig, found] of Object.entries(spaSignals)) {
		if (found) {
			console.log(`  ✅ ${sig}: ${found}`);
		} else {
			console.log(`  ❌ ${sig}: ${found}`);
		}
	}

	// Cookie analysis
	const rawSetCookie = headers["set-cookie"] || "";
	console.log(`\n── Cookie Analysis ──`);
	if (rawSetCookie) {
		console.log(`  Set-Cookie: ${rawSetCookie.substring(0, 200)}`);
		console.log(`  Has 'secure': ${rawSetCookie.toLowerCase().includes("secure")}`);
		console.log(`  Has 'samesite': ${rawSetCookie.toLowerCase().includes("samesite")}`);
	} else {
		console.log(`  No Set-Cookie header`);
	}

	// Count expected findings
	let expectedFindings = 0;
	const missingHeaders = ["content-security-policy", "strict-transport-security",
		"x-content-type-options", "x-frame-options", "referrer-policy", "permissions-policy"];
	for (const h of missingHeaders) {
		if (!headers[h]) expectedFindings++;
	}
	if (targetUrl.startsWith("http://")) expectedFindings++; // insecure transport
	if (headers["server"]) expectedFindings++; // server disclosure
	if (rawSetCookie && !rawSetCookie.toLowerCase().includes("secure")) expectedFindings++;
	if (rawSetCookie && !rawSetCookie.toLowerCase().includes("samesite")) expectedFindings++;

	console.log(`\n── Expected Passive Findings: ${expectedFindings} ──`);
}

(async () => {
	for (const t of targets) {
		await testTarget(t);
	}
	console.log("\n\nDone.");
})();
