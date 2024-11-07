import OpenaiProvider from "../../services.ts/OpenaiProvider";
import { Data, QuestionItem } from "./types";

export const fixCalculations = (data: Data) => {
  console.log("----");
  console.log("Fixing calculations...");
  console.log("----");

  data["test-data"].forEach((item) => {
    const [num1, operator, num2] = item.question.split(" ");
    const parsedNum1 = parseInt(num1, 10);
    const parsedNum2 = parseInt(num2, 10);

    let fixedAnswer: number | undefined;
    if (operator === "+") {
      fixedAnswer = parsedNum1 + parsedNum2;
    }

    if (fixedAnswer !== item.answer) {
      item.answer = fixedAnswer ?? item.answer;
      console.log(
        `Fixed: ${item.question} from ${item.answer} to ${fixedAnswer}`
      );
    }
  });
};

export const extractQuestionsForLLM = (data: Data): QuestionItem[] => {
  console.log("----");
  console.log("Extracting questions for LLM...");
  console.log("----");

  const extractedQuestions = data["test-data"]
    .filter((item) => item.test && item.test.q)
    .map((item) => ({ original: item, question: item.test?.q ?? "" }));

  return extractedQuestions;
};

export const getAnswersFromLLM = async (
  questions: QuestionItem[]
): Promise<void> => {
  console.log("----");
  console.log("Getting answers from LLM...");
  console.log("----");

  const answers = await Promise.all(
    questions.map(async (q) => {
      const response = await sendQuestionsToLLM(q.question);
      return response;
    })
  );

  questions.forEach((q, index) => {
    if (q.original.test) {
      q.original.test.a = answers[index] ?? "";
    }
  });
};

export const sendQuestionsToLLM = async (
  question: string
): Promise<string | null> => {
  const res = await OpenaiProvider.getCompletion({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "Answer the question. Be very concise. Answer very short in one word.",
      },
      { role: "user", content: question },
    ],
  });

  if (!("choices" in res)) {
    throw new Error("Expected a ChatCompletion, but got a stream.");
  }

  return res.choices[0].message.content;
};
