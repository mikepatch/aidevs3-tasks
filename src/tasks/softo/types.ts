export type Answer = {
  questionId: string;
  answer: string | null;
  confidence: number;
};

export type AnalysisResponse = {
  hasAnswer: boolean;
  answer: string | null;
  nextLinks: string[] | null;
  reasoning: string;
  confidence: number;
};

export type LinkAnalysisResponse = {
  selectedLink: string | null;
  confidence: number;
  reasoning: string;
};

export type FormattedQuestion = {
  id: string;
  question: string;
};

export type FormattedQuestions = {
  result: FormattedQuestion[];
};
