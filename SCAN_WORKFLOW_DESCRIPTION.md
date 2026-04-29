# HexStrike Scan Workflow Description

This document provides a detailed breakdown of the 7-stage security auditing pipeline used by HexStrike.

## 🔄 Pipeline Overview

1.  **Ingress & Validation**: Sanitization and SSRF protection for target URLs.
2.  **Phase 1: Discovery & Profiling**: Fingerprinting technologies and infrastructure.
3.  **Phase 2: Intelligent Engine Dispatch**: Dynamic tool selection based on the target profile.
4.  **Phase 3: Multi-Tool Scanning**: Parallel execution of active DAST tools.
5.  **Phase 4: Passive Analysis**: Security header and cookie flag inspection.
6.  **Phase 5: Normalization & Deduplication**: Noise reduction and OWASP category mapping.
7.  **Phase 6: AI Enrichment & Analysis**: Remediation logic and impact assessment via LLM.

---

## 🛠️ Stage Details

### Stage 1: Ingress & Validation
- **Logic**: Normalizes `altoro.testfire.net` to `http://altoro.testfire.net/`.
- **Security**: Blocks internal IP ranges and loopback addresses.

### Stage 2: Discovery & Profiling
- **Engine**: Python-based discovery library.
- **Output**: Identifies tech like Apache, Tomcat, or PHP to optimize subsequent tool usage.

### Stage 3: Intelligent Dispatch
- **Selection**: Skips WPScan if WordPress is not detected; triggers SQLMap if query parameters are found.

### Stage 4: Multi-Tool Scanning
- **Tools**: Concurrent execution of Nuclei, Nikto, DalFox, etc.
- **Reporting**: Aggregates raw output for analysis.

### Stage 5: Passive Analysis
- **Focus**: Extracts security headers (CSP, HSTS) and cookie attributes (Secure, HttpOnly).

### Stage 6: Normalization
- **Processing**: Standardizes tool-specific titles into a unified format.
- **Deduplication**: Ensures identical findings across different tools are merged.

### Stage 7: AI Intelligence
- **Ollama Integration**: Generates professional Remediation steps and business Impact reports for each finding.
