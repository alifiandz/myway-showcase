type FitProgram = { title: string; curriculum: string[]; entry: string; math: string; location: string; language: string; tuition: string; experience: string };
type FitStudy = { status: string; areas: string[] };
type FitProfile = { fields?: string; avoidedFields?: string; degree?: string; math?: string; countries?: string; language?: string; budget?: string };
export type FitResult = {
  score: number | null;
  label: "Strong fit" | "Good fit" | "Possible fit" | "Low fit" | "Complete profile" | "Must-have unverified";
  mustHaveGaps: string[];
  confidence: number;
  reasons: string[];
  breakdown: { label: string; weight: number; score: number; note: string }[];
};

export function calculateProgramFit(program: FitProgram, study: FitStudy | undefined, profile: FitProfile, priorities: Record<string, string>): FitResult {
  const selectedFields = (profile.fields || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const avoidedFields = (profile.avoidedFields || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const areas = (study?.areas ?? program.curriculum).map((item) => item.toLowerCase());
  const searchable = [program.title, ...areas].join(" ").toLowerCase();
  const breakdown: FitResult["breakdown"] = [];

  if (study?.status === "graduate-only" || /no direct undergraduate/i.test(program.entry)) {
    return { mustHaveGaps: [], score: 0, label: "Low fit", confidence: 100, reasons: ["This institution does not currently offer a direct undergraduate route."], breakdown: [{ label: "Study access", weight: 25, score: 0, note: "No direct undergraduate degree" }] };
  }

  if (selectedFields.length) {
    const selectedMatches = selectedFields.filter((field) => searchable.includes(field) || areas.some((area) => area.includes(field) || field.includes(area)));
    const avoidedMatches = avoidedFields.filter((field) => searchable.includes(field));
    const score = avoidedMatches.length ? 25 : selectedMatches.length ? Math.min(100, 78 + selectedMatches.length * 8) : 55;
    breakdown.push({ label: "Business interests", weight: 25, score, note: avoidedMatches.length ? `Includes an avoided area: ${avoidedMatches[0]}` : selectedMatches.length ? `Matches ${selectedMatches.slice(0, 2).join(" and ")}` : "Broad business overlap" });
  }

  const degree = (profile.degree || "").toLowerCase();
  const directBachelor = study?.status === "bachelor" || /bachelor.+available|direct bachelor/i.test(program.entry);
  const restricted = study?.status === "restricted" || /restricted/i.test(program.entry);
  const accessScore = restricted ? 40 : directBachelor ? 95 : 65;
  breakdown.push({ label: "Study access", weight: 25, score: accessScore, note: restricted ? "Restricted undergraduate eligibility" : degree.includes("bachelor") || !degree ? "Bachelor’s programme confirmed; admissions vary" : "Check degree-route compatibility" });

  const mathPreference = (profile.math || "").toLowerCase();
  const mathEvidence = (program.math || "").toLowerCase();
  if (mathPreference && !/not yet verified/.test(mathEvidence)) {
    const wantsLow = /low|light/.test(mathPreference);
    const isHigh = /high|heavy/.test(mathEvidence);
    const isModerate = /moderate/.test(mathEvidence);
    const score = wantsLow ? (isHigh ? 25 : isModerate ? 68 : 95) : 88;
    breakdown.push({ label: "Math comfort", weight: 15, score, note: `${profile.math} preference · ${program.math} programme load` });
  }

  const practicalScores: number[] = [];
  const practicalNotes: string[] = [];
  if (profile.countries) {
    const countries = profile.countries.toLowerCase().split(",").map((item) => item.trim()).filter(Boolean);
    const match = countries.some((country) => program.location.toLowerCase().includes(country));
    practicalScores.push(match ? 100 : 45);
    practicalNotes.push(match ? "Preferred location" : "Outside preferred locations");
  }
  if (profile.language) {
    const match = program.language.toLowerCase().includes(profile.language.toLowerCase()) || (/english/i.test(profile.language) && /english/i.test(program.language));
    practicalScores.push(match ? 100 : 40);
    practicalNotes.push(match ? "Preferred teaching language" : "Language needs review");
  }
  if (practicalScores.length) breakdown.push({ label: "Location & language", weight: 15, score: Math.round(practicalScores.reduce((sum, value) => sum + value, 0) / practicalScores.length), note: practicalNotes.join(" · ") });

  const budgetText = profile.budget || "";
  const budget = Number(budgetText.replace(/[^0-9.]/g, ""));
  const tuition = Number((program.tuition || "").replace(/[^0-9.]/g, ""));
  if (/(€|eur)/i.test(budgetText) && budget > 0 && tuition > 0 && !/not yet verified|see the current/i.test(program.tuition)) {
    breakdown.push({ label: "Budget", weight: 10, score: tuition <= budget ? 100 : tuition <= budget * 1.2 ? 60 : 25, note: tuition <= budget ? "Within the recorded tuition limit" : "Above the recorded tuition limit" });
  }

  const activePriorities = Object.entries(priorities).filter(([, value]) => value === "Must have" || value === "Prefer");
  const opportunityEvidence = `${program.experience} ${program.curriculum.join(" ")}`.toLowerCase()
    .split(/[.;\n]/).filter((part) => !/\b(no|not|unverified|unavailable|unknown)\b|needs? verification|check the official/.test(part)).join(" ");
  const hasOpportunity = (key: string) => {
    const patterns: Record<string, RegExp> = {
      Exchange: /\b(exchange|study abroad|international mobility)\b/,
      Internships: /\b(internships?|work placement)\b/,
      "Career services": /\b(career|employer)\b/,
      Scholarships: /\b(scholarships?|bursaries)\b/,
      "Entrepreneurship support": /\b(incubat|venture|entrepreneurship support)/,
      "Industry projects": /\b(industry projects?|company projects?|consulting projects?)\b/,
    };
    return patterns[key]?.test(opportunityEvidence) ?? false;
  };
  const mustHaveGaps = activePriorities.filter(([key, priority]) => priority === "Must have" && !hasOpportunity(key)).map(([key]) => key);
  if (activePriorities.length) {
    const total = activePriorities.reduce((sum, [, priority]) => sum + (priority === "Must have" ? 2 : 1), 0);
    const evidenced = activePriorities.reduce((sum, [key, priority]) => sum + (hasOpportunity(key) ? (priority === "Must have" ? 2 : 1) : 0), 0);
    breakdown.push({ label: "Opportunities", weight: 10, score: Math.round(evidenced / total * 100), note: mustHaveGaps.length ? `Must-have evidence missing: ${mustHaveGaps.join(", ")}` : `${activePriorities.filter(([key]) => hasOpportunity(key)).length} selected priorities evidenced` });
  }

  if (!selectedFields.length && !profile.countries && !profile.language && !profile.math && !activePriorities.length) {
    return { mustHaveGaps: [], score: null, label: "Complete profile", confidence: 0, reasons: ["Add study interests and preferences to calculate a personal match."], breakdown };
  }

  const availableWeight = breakdown.reduce((sum, item) => sum + item.weight, 0);
  const rawScore = Math.round(breakdown.reduce((sum, item) => sum + item.score * item.weight, 0) / Math.max(availableWeight, 1));
  const score = mustHaveGaps.length ? Math.min(rawScore, 59) : rawScore;
  const label: FitResult["label"] = mustHaveGaps.length ? "Must-have unverified" : score >= 88 ? "Strong fit" : score >= 75 ? "Good fit" : score >= 60 ? "Possible fit" : "Low fit";
  const reasons = [...breakdown].sort((a, b) => b.score - a.score).slice(0, 3).map((item) => `${item.label}: ${item.note}`);
  if (mustHaveGaps.length) reasons.unshift(`Confirm your must-haves: ${mustHaveGaps.join(", ")}`);
  return { mustHaveGaps, score, label, confidence: Math.min(100, availableWeight), reasons, breakdown };
}

export function selectRecommendations<T extends { id: string }>(candidates: T[], fits: Record<string, FitResult>, limit = 3): T[] {
  return candidates.filter((candidate) => {
    const fit = fits[candidate.id];
    return fit && fit.score !== null && fit.score >= 60 && fit.mustHaveGaps.length === 0;
  }).sort((a, b) => (fits[b.id].score ?? -1) - (fits[a.id].score ?? -1) || a.id.localeCompare(b.id)).slice(0, limit);
}
