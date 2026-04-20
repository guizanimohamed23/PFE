# HexStrike PFE - Quick Reference Guide

## 🚀 Quick Start Commands

### Setup (Sprint 1)
```bash
# Setup Backend
cd PFE_BACKEND/backend
npm install
npx prisma generate
npx prisma migrate dev

# Setup Frontend
cd PFE_FRONTEND/pfe-frontend
npm install

# Start Development
# Terminal 1 (Backend):
npm run dev

# Terminal 2 (Frontend):
npm run dev
```

### Tools to Install
- PostgreSQL (for database)
- HexStrike (security scanner)
- Ollama (local LLM)
- Node.js v18+

---

## 📅 Sprint Milestones

| Sprint | Duration | Key Goals | Report Pages |
|--------|----------|-----------|--------------|
| 1 | Weeks 1-3 | Research, Setup, Structure | 40-50 |
| 2 | Weeks 4-6 | HexStrike, Auth, Normalization | 60-75 |
| 3 | Weeks 7-9 | Frontend, Ollama, UI | 80-95 |
| 4 | Weeks 10-13 | Graphs, Polish, Accuracy | 110-130 |
| 5 | Weeks 14-16 | Testing, Features, Final | 140-160 |

---

## 📋 What to Work on Each Day

### Sprint 1 - Research Phase (Week 1)
- **Day 1-2**: Read HexStrike docs + normalization concepts
- **Day 3-4**: Study OWASP + tool comparison
- **Day 5**: Research Ollama + attack visualization

### Sprint 1 - Setup Phase (Week 2-3)
- **Day 8-9**: Install PostgreSQL + HexStrike
- **Day 10-11**: Setup Ollama + test models
- **Day 12-15**: Database schema + backend structure

### Sprint 2 - Integration (Week 4-5)
- **Day 22-24**: HexStrike integration
- **Day 25-27**: Authentication system
- **Day 28-29**: Normalization engine

### Sprint 3 - Frontend (Week 7-9)
- **Day 36-37**: React setup + components
- **Day 38-40**: Ollama integration
- **Day 41-43**: Auth UI + Dashboard

### Sprint 4 - Advanced (Week 10-13)
- **Day 50-52**: Graph generation
- **Day 53-58**: Frontend visualization
- **Day 59-63**: Accuracy improvements

### Sprint 5 - Final (Week 14-16)
- **Day 71-74**: Testing + bug fixes
- **Day 75-79**: Features + documentation
- **Day 80-84**: Polish + final report

---

## 🎯 Daily Workflow

### Morning (9 AM)
1. Review yesterday's progress
2. Choose today's 1-2 main tasks
3. Check blockers from yesterday

### During Day (9 AM - 5 PM)
1. Code: 60% time
2. Report: 20% time (screenshots, update chapters)
3. Testing: 20% time

### Evening (5 PM)
1. Fill daily standup log (5 min)
2. Git commit with meaningful message
3. Update % complete
4. Plan tomorrow's tasks

---

## 📊 Key Performance Indicators

### After Each Sprint
- **Code Quality**: Lines of code, test coverage
- **Documentation**: Pages written, chapters completed
- **Features**: What's working/not working
- **Bugs**: Critical, high, medium, low severity
- **Report**: Progress and quality

---

## 💻 Key Files to Know

### Backend
```
PFE_BACKEND/backend/
├── src/
│   ├── server.js          # Main entry point
│   ├── app.js             # Express setup
│   ├── services/          # ALL BUSINESS LOGIC HERE
│   ├── controllers/       # Route handlers
│   ├── routes/            # API endpoints
│   └── middleware/        # Auth, validation, errors
├── prisma/
│   ├── schema.prisma      # Database definition
│   └── migrations/        # Database changes
└── package.json           # Dependencies
```

### Frontend
```
PFE_FRONTEND/pfe-frontend/
├── src/
│   ├── main.tsx          # Entry point
│   ├── App.tsx           # Main component
│   ├── pages/            # Page components
│   ├── components/       # Reusable components
│   ├── services/         # API calls
│   ├── types/            # TypeScript types
│   └── context/          # State management
├── vite.config.js        # Build config
└── package.json          # Dependencies
```

---

## 🔑 Critical Tasks (Don't Skip)

1. **✅ Start report on Day 1** - Don't wait until end
2. **✅ Test HexStrike early** - It's the core scanner
3. **✅ Implement auth properly** - Security is important
4. **✅ Test normalization thoroughly** - Accuracy matters
5. **✅ Start frontend early** - Need time for polish
6. **✅ Document as you go** - Way easier than rewriting
7. **✅ Test end-to-end by Sprint 3** - Catch integration issues
8. **✅ Leave Sprint 5 for polish** - Don't save bugs for last week

---

## 🚨 Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| HexStrike won't connect | Port not open or wrong URL | Check `.env` file, verify HexStrike running |
| Tests failing | Outdated dependencies | `npm install` and `npm update` |
| Database migrations fail | Schema conflict | Delete migrations folder, start fresh |
| Ollama too slow | No GPU acceleration | Use smaller model (Mistral) or cache responses |
| Graph not rendering | Too many nodes (>100) | Implement pagination or filtering |
| Frontend HTTP 401 errors | JWT token expired | Check token refresh logic |

---

## 📝 Report Writing Tips

### For Each Chapter
1. **Write title** - Be specific
2. **Add introduction** - Say what this chapter covers
3. **Add content** - Explain the how and why
4. **Add visuals** - Screenshots, diagrams, tables
5. **Add code snippets** - Key algorithm pseudocode
6. **Add results** - Test outputs, metrics
7. **Write conclusion** - Summarize key points

### Diagram Tools (Free)
- Draw.io - For architecture diagrams
- Exceldraw - For ER diagrams
- Mermaid - For flowcharts

### Screenshots
- Use Snagit or built-in screenshot tools
- Crop to relevant area
- Add annotations with arrows/boxes
- Include both success and error cases

---

## 🎓 Key Concepts to Explain in Report

1. **Normalization** - How duplicates are merged
2. **Deduplication** - Why finding 1 SQL injection vs 3 matters
3. **Noise Filtering** - How progress logs are removed
4. **Severity Promotion** - Why finding `uid=root` makes it critical
5. **Attack Chains** - How one vuln enables another
6. **Graph Visualization** - Why visual representation helps security
7. **LLM Analysis** - How AI enhances vulnerability descriptions

---

## 📚 Tech Stack Reference

### Backend
- **Express.js** - Web framework
- **Prisma** - Database ORM
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **PostgreSQL** - Database

### Frontend
- **React 19** - UI library
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **XY Flow** - Graph visualization
- **Socket.io** - Real-time updates

### External Tools
- **HexStrike** - Vulnerability scanner
- **Ollama** - Local LLM
- **Prisma** - Database management

---

## ✍️ Report Chapters Checklist

- [ ] 1. Introduction & Objectives
- [ ] 2. Literature Review & Background
- [ ] 3. System Architecture & Technology Stack
- [ ] 4. Database Design & Schema
- [ ] 5. Backend Architecture & Services
- [ ] 6. HexStrike Integration
- [ ] 7. Normalization Algorithm & Noise Filtering
- [ ] 8. Frontend Architecture & Design
- [ ] 9. AI Integration & Ollama
- [ ] 10. Frontend Implementation
- [ ] 11. Attack Path Visualization & Graph Generation
- [ ] 12. Frontend Features & User Experience
- [ ] 13. Accuracy & Performance Optimizations
- [ ] 14. Testing Strategy & Results
- [ ] 15. Additional Features & User Management
- [ ] 16. Conclusion & Future Work
- [ ] Appendix A: Setup Instructions
- [ ] Appendix B: API Documentation
- [ ] Appendix C: Database Schema
- [ ] Appendix D: Code Statistics
- [ ] Appendix E: Test Results
- [ ] Appendix F: Deployment Guide

---

## 🎯 Success Criteria

### Sprint 1: ✅
- All tools installed and working
- Database ready
- 40-50 page report

### Sprint 2: ✅
- HexStrike integration working
- Auth system secure
- Normalization >60% deduplication
- 60-75 page report

### Sprint 3: ✅
- Frontend looks professional
- Ollama providing insights
- Full integration working
- 80-95 page report

### Sprint 4: ✅
- Graphs rendering correctly
- Scan accuracy >85%
- Real-time features working
- 110-130 page report

### Sprint 5: ✅
- >80% test coverage
- Zero critical bugs
- All features polished
- 140-160 page comprehensive report

---

## 📞 Getting Help

### If you get stuck:
1. **Check documentation first** - HexStrike docs, React docs
2. **Search Stack Overflow** - 95% of issues have solutions
3. **Read error messages carefully** - They tell you what's wrong
4. **Google the error** - Usually find answer in minutes
5. **Test in isolation** - Find minimum code that reproduces issue
6. **Add logging** - `console.log()` or debug breakpoints
7. **Take a break** - Sometimes fresh eyes see the problem

---

## 🏁 Final Checklist Before Defense

- [ ] Report: 140-160 pages, professional formatting
- [ ] Code: Clean, commented, no console.log() spam
- [ ] Tests: >80% coverage, all passing
- [ ] Demo: Practiced, smooth, no crashes
- [ ] Presentation: Slides ready, practiced speech
- [ ] Deployment: Docker files ready, one-command setup
- [ ] Git: Meaningful commit history
- [ ] Documentation: Complete setup guide
- [ ] Backups: All files backed up

---

**You've got this! Remember: Consistent daily progress beats last-minute cramming! 🚀**

