// Built-in sample dataset matching the reference roadmap
const SAMPLE_ROWS = [
  // ── Establish · People ──
  ["Establish", "People", "Stable, Credible leadership pipeline", "Board, LC, LD", "done"],
  ["Establish", "People", "Stable, Credible leadership pipeline", "Special Roles", "inprogress"],
  ["Establish", "People", "Stable, Credible leadership pipeline", "High Potentials", "todo"],
  ["Establish", "People", "Stable, Credible leadership pipeline", "Talent and Retention structures", "done"],
  ["Establish", "People", "Stable, Credible leadership pipeline", "Hire young leaders", "inprogress"],
  ["Establish", "People", "Self-sustaining Talent ecosystem", "Higher Standard Recruitment Process", "todo"],
  ["Establish", "People", "Self-sustaining Talent ecosystem", "Continuous upgrading of roles", "inprogress"],
  ["Establish", "People", "Performance Management", "OKRs/KPIs/Goals set", "done"],
  ["Establish", "People", "Performance Management", "Performance based incentives introduced", "inprogress"],
  ["Establish", "People", "Design and Execute EVP", "Build a brand story on select media", "done"],
  ["Establish", "People", "Design and Execute EVP", "Represent GMR GCC in key events", "todo"],

  // ── Establish · Process ──
  ["Establish", "Process", "Move from projects toContinuous Improvementculture", "Modern Six Sigma", "done"],
  ["Establish", "Process", "Move from projects toContinuous Improvementculture", "Agile / SAFe", "inprogress"],
  ["Establish", "Process", "Move from projects toContinuous Improvementculture", "Mining, RPA, AI, Data analytics", "todo"],
  ["Establish", "Process", "Move from projects toContinuous Improvementculture", "Ensure on time and in full S4 deliverables", "done"],
  ["Establish", "Process", "Portfolio Expansion", "Problem Solving", "inprogress"],
  ["Establish", "Process", "Portfolio Expansion", "Project Management", "done"],
  ["Establish", "Process", "Portfolio Expansion", "Change Management Automation", "inprogress"],
  ["Establish", "Process", "Portfolio Expansion", "Analytics", "todo"],

  // ── Establish · Technology ──
  ["Establish", "Technology", "S4HANA", "100% S4 adoption", "inprogress"],
  ["Establish", "Technology", "S4HANA", "Tech integrated problem solving and solutioning", "done"],

  // ── Enhance · People ──
  ["Enhance", "People", "Brand Campaign", "Launch Internal brand campaign that showcases momentum", "todo"],
  ["Enhance", "People", "New Ways of Working", "Impact Rituals designed and implemented", "inprogress"],
  ["Enhance", "People", "New Ways of Working", "Capability-building programs", "todo"],
  ["Enhance", "People", "People Development", "Job Architectures & Career paths set up", "done"],
  ["Enhance", "People", "People Development", "Create Holistic Growth plan for all employees", "inprogress"],
  ["Enhance", "People", "People Development", "Learning & Development Plan", "todo"],

  // ── Enhance · Process ──
  ["Enhance", "Process", "CoE Transition", "HR CoE", "done"],
  ["Enhance", "Process", "CoE Transition", "Procurement CoE", "inprogress"],
  ["Enhance", "Process", "CoE Transition", "MDM CoE", "todo"],
  ["Enhance", "Process", "Continuous Improvement become a way of life", "Set up a well-functioning CI engine", "done"],
  ["Enhance", "Process", "Continuous Improvement become a way of life", "Set up an Innovation Hub", "inprogress"],
  ["Enhance", "Process", "Core Business Function Pilot", "Pilot execution", "todo"],

  // ── Enhance · Technology ──
  ["Enhance", "Technology", "Automation Strategy", "Reposition tech as enabler and Align Tech ← Process ← People", "done"],
  ["Enhance", "Technology", "Automation Strategy", "Harmonize Mining, RPA, AI, Data analytics", "todo"],
  ["Enhance", "Technology", "Reposition Tech", "Tech ← Process ← People as enabler", "done"],

  // ── Optimize · People ──
  ["Optimize", "People", "Performance Culture", "Measures designed to shift and sustain high performance and ownership Culture", "done"],
  ["Optimize", "People", "Learning Organization", "New ways of working sustained", "inprogress"],
  ["Optimize", "People", "Employee Experience", "Redesign employee life cycle", "todo"],

  // ── Optimize · Process ──
  ["Optimize", "Process", "Core Business Transitions", "Identification of core Business support to be transitioned", "done"],
  ["Optimize", "Process", "Process Excellence", "Processes documented and measured constantly", "done"],
  ["Optimize", "Process", "Process Excellence", "Global Standards maintained", "inprogress"],
  ["Optimize", "Process", "Process Excellence", "Push for Max digital", "todo"],

  // ── Optimize · Technology ──
  ["Optimize", "Technology", "Tech-embedded Capability building", "Develop techno functional Expertise", "done"],
  ["Optimize", "Technology", "Tech-embedded Capability building", "Encourage Rapid Prototyping and innovation", "inprogress"],
  ["Optimize", "Technology", "Tech-embedded Capability building", "Problem solving in the era of AI", "todo"],
];

export const sampleRows = SAMPLE_ROWS.map(
  ([phase, dimension, category, task, status]) => ({
    phase,
    dimension,
    category,
    task,
    status,
  })
);
