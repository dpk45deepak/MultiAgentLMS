/** Hard input limits shared by the API routes and the UI. Dependency-free so client components can import it. */
export const LIMITS = {
  tutorMessage: 4000,
  syllabusText: 20000,
  shortAnswer: 2000,
  name: 120,
  maxAnswers: 50,
  imageBytes: 8 * 1024 * 1024,
  /** Largest JSON request body we will even parse. */
  jsonBodyChars: 200_000,
} as const;
