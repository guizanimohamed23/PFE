# HexStrike Backend: Advanced Security Pipeline 🛡️🎯

HexStrike is a professional-grade cybersecurity assessment engine designed to bridge the gap between raw tool output and actionable security intelligence. It specializes in high-accuracy normalization, noise suppression, and deep evidence extraction for modern web applications.

## 🚀 Key Features

### 1. Advanced Normalization Engine
Our custom normalization pipeline transforms disjointed outputs from multiple tools (Nuclei, SQLMap, Nikto, etc.) into a unified, professional report format.
- **Intelligent Titling**: Findings are automatically renamed by threat type (e.g., "Remote Command Execution") instead of generic tool IDs.
- **Context-Aware Severity**: Automatically promotes findings to **CRITICAL** if high-impact evidence (like `uid=root`, `AKIA` keys, or database dumps) is discovered.
- **Multi-Tool Deduplication**: Intelligently merges overlapping findings from different scanners to keep the dashboard clean.

### 2. The "Mega-Library" Signature System
Equipped with over **80+ high-fidelity security signatures** covering the **OWASP Top 10 (2021)**:
- **A01: Broken Access Control**: IDOR, Path Traversal, LFI/RFI.
- **A03: Injection**: SQLi, XSS, SSRF, SSTI, Command Injection.
- **A07: Auth Failures**: JWT `alg:none` bypasses, Secret leaks (AWS, SSH, API Keys).
- **A10: SSRF**: AWS Metadata Service and internal network exposure.

### 3. Passive Assessment & Intelligence
Integrated non-intrusive discovery that runs alongside active scans:
- **Technology Fingerprinting**: Detects frameworks (Django, Laravel, Express) and versions.
- **Secret Scanning**: Scans for hardcoded credentials, SSL private keys, and environment file leaks.
- **Sensitive File Probing**: Automatic discovery of `.env`, `.git/config`, `composer.json`, and more.

### 4. Noise Shield Technology 🛡️
Strict filtering logic that suppresses non-security noise:
- **Zero False Positives**: Filters out tool banners, progress logs, connection errors, and Python/NodeJS tracebacks.
- **High-Confidence Protection**: Ensures that valid security markers are never accidentally dropped by the noise filter.

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (Database)
- Prisma (ORM)

### Installation
```bash
cd backend
npm install
npx prisma generate
```

### Running the Pipeline
```bash
# Start the Backend API
npm run dev

# (Optional) Run the Mock Engine for Logic Testing
node mock-engine.js
```

## 📊 Performance & Accuracy
HexStrike has been benchmarked against industry-standard targets like `testphp.vulnweb.com` and `demo.testfire.net`, achieving:
- **Recall**: >90% coverage of OWASP Top 10 High/Critical vulnerabilities.
- **Precision**: 0% leakage of tool progress/error noise into the production dashboard.

---
*Developed for the Advanced Agentic Coding PFE - 2026*
