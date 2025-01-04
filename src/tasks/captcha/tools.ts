import { ChatCompletionMessageParam } from "openai/src/resources/index.js";
import { OpenaiService } from "../../services/OpenaiService";
import { Credentials } from "./types";

const openaiProvider = new OpenaiService();

const URL = "https://xyz.ag3nts.org";

const getSiteHtml = async () => {
  const response = await fetch(URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch site. Status: ${response.status}`);
  }

  return await response.text();
};

export const getCaptchaQuestion = async (): Promise<string> => {
  const html = await getSiteHtml();
  const captchaQuestion = html.match(/<p id="human-question">(.+?)<\/p>/)?.[1];

  if (!captchaQuestion) {
    throw new Error("Captcha question not found in the HTML.");
  }

  return captchaQuestion;
};

export const getCaptchaAnswer = async (question: string): Promise<string> => {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: "You are a helpful assistant." },
    {
      role: "user",
      content: `Solve this captcha question: ${question} and return only number and nothing else. 
        <example>
            question: Rok założenia facebooka
            AI: 2004
        </example>
          `,
    },
  ];
  const response = await openaiProvider.getCompletion({ messages });

  if (!("choices" in response)) {
    throw new Error("Expected a ChatCompletion, but got a stream.");
  }

  const answer = response.choices[0].message.content;

  return answer || "";
};

export const signIn = async (credentials: Credentials) => {
  try {
    const response = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(credentials as any).toString(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.error("Error submitting form:", error);
  }
};
