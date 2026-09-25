// lint-staged config as JS so the Java task can run once without receiving
// staged file paths as Gradle arguments.
export default {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css}": ["prettier --write"],
  // Formats all Java via Spotless; lint-staged re-stages anything it touches.
  "backend/**/*.java": () => "node scripts/run-backend.mjs spotlessApply",
}
