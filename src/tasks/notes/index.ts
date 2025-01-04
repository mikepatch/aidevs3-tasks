import { OpenAI } from "openai";
import fs from "fs/promises";
import path from "path";
import { PdfService } from "../../services/PdfService";
import { TasksService } from "../../services/TasksService";
import { OpenaiService } from "../../services/OpenaiService";
import { logMessage, logAnswerResponse } from "../../utils";
import { ChatCompletion } from "openai/src/resources/index.js";
import { getAgentSystemPrompt } from "./prompts";

type Answer = {
  _reasoning: string;
  [key: string]: string;
};

const TEMP_DIR = path.join(__dirname, "temp");
const PDF_URL = "https://centrala.ag3nts.org/dane/notatnik-rafala.pdf";
const PDF_PATH = path.join(__dirname, "note.pdf");
const OUTPUT_PATH = path.join(__dirname, "note.txt");

const pdfProvider = new PdfService(TEMP_DIR);
const tasksProvider = new TasksService();
const openaiProvider = new OpenaiService();

const loadExistingNotes = async (
  outputPath: string
): Promise<string | null> => {
  try {
    logMessage({
      type: "process",
      title: "Loading notes...",
    });
    const content = await fs.readFile(outputPath, "utf-8");
    logMessage({
      type: "info",
      title: "Found existing notes, skipping PDF processing",
    });
    return content;
  } catch {
    return null;
  }
};

const ensurePdfExists = async (url: string, pdfPath: string): Promise<void> => {
  try {
    await fs.access(pdfPath);
    logMessage({
      type: "info",
      title: "PDF file already exists, skipping download",
    });
  } catch {
    await pdfProvider.downloadPdf(url, pdfPath);
    logMessage({
      type: "info",
      title: "PDF file has been downloaded successfully",
    });
  }
};

const extractAndSaveText = async (
  pdfPath: string,
  outputPath: string
): Promise<void> => {
  logMessage({ type: "process", title: "Extracting text from PDF..." });
  const { machineText, handwrittenText } = await pdfProvider.extractText(
    pdfPath
  );

  await fs.writeFile(
    outputPath,
    `${machineText}\n\n${handwrittenText}`,
    "utf-8"
  );
  logMessage({
    type: "success",
    title: "Text has been extracted and saved",
    details: { outputPath },
  });
};

const processNotes = async () => {
  // Try to load existing notes first
  let fileContent = await loadExistingNotes(OUTPUT_PATH);

  // If no existing notes, process PDF
  if (!fileContent) {
    logMessage({
      type: "process",
      title: "🔄 Processing PDF to extract notes...",
    });
    await ensurePdfExists(PDF_URL, PDF_PATH);
    await extractAndSaveText(PDF_PATH, OUTPUT_PATH);
    fileContent = await fs.readFile(OUTPUT_PATH, "utf-8");
  }

  return fileContent;
};

const sendAnswer = async (answer: string) => {
  try {
    logMessage({
      type: "process",
      title: "Sending answer to headquarters...",
    });
    const answerResponse = await tasksProvider.sendAnswer(
      "notes",
      JSON.parse(answer)
    );
    logMessage({
      type: "info",
      title: "Answer from headquarters:",
      message: JSON.stringify(answerResponse, null, 2),
    });

    return answerResponse;
  } catch (error) {
    logMessage({
      type: "error",
      title: "Sending answer to headquarters failed.",
      details: {
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
};

const processQuestionsWithAgent = async (
  questions: string,
  notesContent: string,
  remainingAttempts: number = 20,
  previousWrongAnswers: Map<string, Set<string>> = new Map(),
  correctAnswers: Map<string, string> = new Map(),
  answerFeedback?: {
    code: number;
    message: string;
    hint?: string;
    debug?: string;
  }
) => {
  try {
    if (remainingAttempts <= 0) {
      throw new Error(
        "Maximum attempts reached without finding correct answer"
      );
    }
    const parsedAnswerFeedback = JSON.stringify(answerFeedback, null, 2);

    logMessage({
      type: "process",
      title: "Processing questions with Agent...",
      message: `Attempts left: ${remainingAttempts}`,
    });

    // Convert wrong answers to formatted string for the prompt
    const wrongAnswersString = Array.from(previousWrongAnswers.entries())
      .map(([qNum, answers]) =>
        Array.from(answers)
          .map((answer) => `"${qNum}": "${answer}"`)
          .join("\n")
      )
      .join("\n");

    const correctAnswersString = Array.from(correctAnswers.entries())
      .map(([qNum, answer]) => `"${qNum}": "${answer}"`)
      .join("\n");

    logMessage({
      type: "info",
      title: "Sending to Agent:",
      details: {
        wrongAnswers: JSON.stringify(
          Array.from(previousWrongAnswers.entries()).map(([qNum, answers]) => ({
            [qNum]: Array.from(answers),
          })),
          null,
          2
        ),
        correctAnswers: JSON.stringify(
          Object.fromEntries(correctAnswers),
          null,
          2
        ),

        feedback: parsedAnswerFeedback,
      },
    });

    const agentResponse = (await openaiProvider.getCompletion({
      jsonMode: true,
      messages: [
        {
          role: "system",
          content: getAgentSystemPrompt(
            notesContent,
            parsedAnswerFeedback,
            correctAnswersString,
            wrongAnswersString
          ),
        },
        {
          role: "user",
          content: `Questions from headquarters: ${JSON.stringify(questions)}`,
        },
      ],
    })) as ChatCompletion;

    const answers = agentResponse.choices[0].message.content;
    if (!answers) {
      throw new Error("Error in agentResponse.");
    }

    const parsedAnswers = JSON.parse(answers);
    logMessage({
      type: "info",
      title: "Got answers from Agent:",
      message: JSON.stringify(parsedAnswers, null, 2),
    });

    const { _reasoning, ...answersForHeadquarters } = parsedAnswers;
    const answerResponse = await sendAnswer(
      JSON.stringify(answersForHeadquarters)
    );

    if (answerResponse.code !== 0) {
      // Extract the wrong answer from the feedback
      const questionNumber =
        answerResponse.message.match(/question (\d+)/i)?.[1];

      if (questionNumber && answerResponse.debug) {
        const wrongAnswer = answerResponse.debug.replace("You sent: ", "");
        if (wrongAnswer) {
          if (!previousWrongAnswers.has(questionNumber)) {
            previousWrongAnswers.set(questionNumber, new Set());
          }
          previousWrongAnswers.get(questionNumber)?.add(wrongAnswer);
        }
        const { _reasoning, ...answersOnly } = parsedAnswers;
        Object.entries(answersOnly).forEach(([qNum, answer]) => {
          if (parseInt(qNum, 10) < parseInt(questionNumber, 10)) {
            correctAnswers.set(qNum, answer as string);
          }
        });
      }

      return await processQuestionsWithAgent(
        questions,
        notesContent,
        remainingAttempts - 1,
        previousWrongAnswers,
        correctAnswers,
        answerResponse
      );
    }

    return answerResponse;
  } catch (error) {
    if (remainingAttempts === 20) {
      logMessage({
        type: "error",
        title: "Error in processing questions with Agent.",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
};

const main = async () => {
  try {
    const notesContent = await processNotes();
    logMessage({
      type: "process",
      title: "Getting questions from task service...",
    });
    const questions = await tasksProvider.getData("notes.json");
    logMessage({
      type: "info",
      title: " Questions received:",
      message: JSON.stringify(questions, null, 2),
    });

    logMessage({ type: "process", title: "🧠 Starting Agent processing..." });

    const answerResponse = await processQuestionsWithAgent(
      questions,
      notesContent
    );

    logMessage({
      type: "success",
      title: "Process completed!",
      message: JSON.stringify(answerResponse, null, 2),
    });
  } catch (error: unknown) {
    logMessage({
      type: "error",
      title: "Error in main process",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

main();
