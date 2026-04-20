const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {

  console.log("Seeding database...")

  // Create Vulnerability
  const vuln = await prisma.vulnerability.create({
    data: {
      cveId: "CVE-2021-44228",
      title: "Log4Shell RCE",
      description: "Remote Code Execution via Log4j",
      severity: "Critical",
      cvssScore: 10.0
    }
  })

  // Create Attack Scenario
  const scenario = await prisma.attackScenario.create({
    data: {
      vulnerabilityId: vuln.id,
      name: "Log4Shell Full Compromise Chain"
    }
  })

  // Create Steps
  const step1 = await prisma.attackStep.create({
    data: {
      scenarioId: scenario.id,
      stepNumber: 1,
      techniqueId: "T1190",
      title: "Exploit Public-Facing Application",
      description: "Trigger JNDI lookup to achieve RCE",
      severity: "Critical"
    }
  })

  const step2 = await prisma.attackStep.create({
    data: {
      scenarioId: scenario.id,
      stepNumber: 2,
      techniqueId: "T1059",
      title: "Command Execution",
      description: "Execute reverse shell payload",
      severity: "High"
    }
  })

  const step3 = await prisma.attackStep.create({
    data: {
      scenarioId: scenario.id,
      stepNumber: 3,
      techniqueId: "T1003",
      title: "Credential Dumping",
      description: "Extract credentials from memory",
      severity: "High"
    }
  })

  // Create Directed Edges
  await prisma.attackEdge.createMany({
    data: [
      { fromId: step1.id, toId: step2.id },
      { fromId: step2.id, toId: step3.id }
    ]
  })

  console.log("Seeding completed.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })