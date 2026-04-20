const prisma = require("../config/db");

const buildError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const extractJson = (text) => {
  if (!text || typeof text !== "string") {
    throw buildError(502, "AI returned empty response");
  }

  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw buildError(502, "AI response did not include valid JSON");
  }

  return match[0];
};

const mapAiOutputToScenarioPayload = (aiOutput, vulnerabilityId) => {
  if (!aiOutput || typeof aiOutput !== "object") {
    throw buildError(502, "AI output is not a valid object");
  }

  const scenarioName = aiOutput.scenario;
  if (!scenarioName || typeof scenarioName !== "string") {
    throw buildError(502, "AI output missing scenario name");
  }

  const steps = Array.isArray(aiOutput.steps) ? aiOutput.steps : [];
  if (steps.length === 0) {
    throw buildError(502, "AI output missing steps");
  }

  const normalizedSteps = steps.map((step, index) => ({
    stepNumber: Number(step.step_id ?? step.stepNumber ?? index + 1),
    title: String(step.title ?? ""),
    description: String(step.description ?? ""),
    techniqueId: String(step.mitre_technique ?? step.techniqueId ?? ""),
    severity: String(step.severity ?? ""),
  }));

  const edges = [];
  steps.forEach((step) => {
    const fromStepNumber = Number(step.step_id ?? step.stepNumber);
    const nextSteps = Array.isArray(step.next_steps) ? step.next_steps : [];
    nextSteps.forEach((toStepNumber) => {
      edges.push({
        fromStepNumber: Number(fromStepNumber),
        toStepNumber: Number(toStepNumber),
      });
    });
  });

  return {
    vulnerabilityId,
    name: scenarioName,
    steps: normalizedSteps,
    edges,
    recommendations: Array.isArray(aiOutput.recommendations) ? aiOutput.recommendations : [],
  };
};

const mapAiOutputToEphemeralGraph = (aiOutput, vulnerabilityId) => {
  const scenarioPayload = mapAiOutputToScenarioPayload(aiOutput, vulnerabilityId);

  const steps = scenarioPayload.steps.map((step) => ({
    step_id: step.stepNumber,
    title: step.title,
    description: step.description,
    mitre_technique: step.techniqueId,
    severity: step.severity,
    next_steps: scenarioPayload.edges
      .filter((edge) => edge.fromStepNumber === step.stepNumber)
      .map((edge) => edge.toStepNumber),
  }));

  const nodes = steps.map((step) => ({
    id: String(step.step_id),
    data: {
      stepNumber: step.step_id,
      title: step.title,
      description: step.description,
      techniqueId: step.mitre_technique,
      severity: step.severity,
    },
  }));

  const edges = [];
  steps.forEach((step) => {
    step.next_steps.forEach((nextStepId, index) => {
      edges.push({
        id: `e-${step.step_id}-${nextStepId}-${index}`,
        source: String(step.step_id),
        target: String(nextStepId),
        animated: true,
      });
    });
  });

  return {
    vulnerabilityId,
    scenario: scenarioPayload.name,
    steps,
    recommendations: scenarioPayload.recommendations,
    graph: {
      nodes,
      edges,
    },
  };
};

exports.generateScenarioWithAI = async (payload) => {
  const vulnerabilityId = Number(payload?.vulnerabilityId);
  const language = payload?.language || "en";
  const stepCount = Number(payload?.stepCount || 5);

  if (!Number.isInteger(vulnerabilityId) || vulnerabilityId < 1) {
    throw buildError(400, "vulnerabilityId must be a positive integer");
  }

  if (!Number.isInteger(stepCount) || stepCount < 3 || stepCount > 10) {
    throw buildError(400, "stepCount must be between 3 and 10");
  }

  const vulnerability = await prisma.vulnerability.findUnique({
    where: { id: vulnerabilityId },
  });

  if (!vulnerability) {
    throw buildError(404, "Vulnerability not found");
  }

  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "mistral";
  const ollamaTimeoutMs = Math.max(10000, Number(process.env.OLLAMA_TIMEOUT_MS) || 120000);

  const systemPrompt =
    "You are a cybersecurity red-team assistant. Respond with ONLY a JSON object matching the requested schema. No markdown or extra text.";

  const userPrompt = [
    "Generate an attack scenario for the following vulnerability.",
    "Return JSON with this schema:",
    "{",
    '  "scenario": "string (short name)",',
    '  "steps": [',
    "    {",
    '      "step_id": number (starts at 1),',
    '      "title": "string",',
    '      "description": "string",',
    '      "mitre_technique": "T####",',
    '      "severity": "Critical|High|Medium|Low",',
    '      "next_steps": [number]',
    "    }",
    "  ],",
    '  "recommendations": ["string"]',
    "}",
    `Steps count: ${stepCount}.`,
    `Language: ${language}.`,
    `CVE: ${vulnerability.cveId}.`,
    `Title: ${vulnerability.title}.`,
    `Description: ${vulnerability.description}.`,
    `Severity: ${vulnerability.severity}.`,
    `CVSS: ${vulnerability.cvssScore}.`,
  ].join("\n");

  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), ollamaTimeoutMs);

  let response;
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
      signal: abortController.signal,
    });
  } catch (fetchErr) {
    if (fetchErr?.name === "AbortError") {
      throw buildError(504, `AI gateway timed out after ${ollamaTimeoutMs}ms. Is Ollama running at ${baseUrl}?`);
    }
    throw buildError(502, `AI gateway unreachable: ${fetchErr?.message || "connection refused"}`);
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw buildError(502, `AI gateway error: ${errorBody}`);
  }

  const data = await response.json();
  const content = data?.message?.content;
  const jsonText = extractJson(content);
  let aiOutput;
  try {
    aiOutput = JSON.parse(jsonText);
  } catch (parseErr) {
    throw buildError(502, `AI returned invalid JSON: ${parseErr.message}`);
  }

  const result = mapAiOutputToEphemeralGraph(aiOutput, vulnerabilityId);

  return {
    ...result,
    aiRaw: aiOutput,
  };
};

exports.generateRiskAssessmentWithAI = async (payload) => {
  const scanId = Number(payload?.scanId);
  const language = payload?.language || "en";

  if (!Number.isInteger(scanId) || scanId < 1) {
    throw buildError(400, "scanId must be a positive integer");
  }

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: {
      results: {
        include: {
          vulnerability: true,
        },
      },
    },
  });

  if (!scan) {
    throw buildError(404, "Scan not found");
  }

  if (!scan.results || scan.results.length === 0) {
    throw buildError(400, "Scan has no results to assess");
  }

  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL || "mistral";
  const ollamaTimeoutMs = Math.max(10000, Number(process.env.OLLAMA_TIMEOUT_MS) || 120000);

  const findings = scan.results.map((result) => ({
    evidence: result.evidence,
    cveId: result.vulnerability?.cveId || null,
    title: result.vulnerability?.title || null,
    severity: result.vulnerability?.severity || null,
    cvssScore: result.vulnerability?.cvssScore || null,
  }));

  const systemPrompt =
    "You are a cybersecurity risk analyst. Respond with ONLY a JSON object matching the requested schema. No markdown or extra text.";

  const userPrompt = [
    "Analyze the scan results and return a risk assessment JSON.",
    "Schema:",
    "{",
    '  "riskScore": number (0-100),',
    '  "businessImpact": "string",',
    '  "prioritizedRemediation": ["string"],',
    '  "complianceImplications": {',
    '    "OWASP": ["string"],',
    '    "PCI_DSS": ["string"]',
    "  }",
    "}",
    `Language: ${language}.`,
    `Target URL: ${scan.targetUrl}.`,
    `Findings: ${JSON.stringify(findings)}.`,
  ].join("\n");

  const abortController2 = new AbortController();
  const timeoutHandle2 = setTimeout(() => abortController2.abort(), ollamaTimeoutMs);

  let response2;
  try {
    response2 = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
      signal: abortController2.signal,
    });
  } catch (fetchErr) {
    if (fetchErr?.name === "AbortError") {
      throw buildError(504, `AI gateway timed out after ${ollamaTimeoutMs}ms. Is Ollama running at ${baseUrl}?`);
    }
    throw buildError(502, `AI gateway unreachable: ${fetchErr?.message || "connection refused"}`);
  } finally {
    clearTimeout(timeoutHandle2);
  }

  if (!response2.ok) {
    const errorBody = await response2.text();
    throw buildError(502, `AI gateway error: ${errorBody}`);
  }

  const data = await response2.json();
  const content = data?.message?.content;
  const jsonText = extractJson(content);
  let aiOutput;
  try {
    aiOutput = JSON.parse(jsonText);
  } catch (parseErr) {
    throw buildError(502, `AI returned invalid JSON: ${parseErr.message}`);
  }

  return {
    scanId,
    assessment: aiOutput,
  };
};