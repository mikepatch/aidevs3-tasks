import {
  ChatCompletion,
  ChatCompletionMessageParam,
} from "openai/src/resources/index.js";
import { rebuildConversationPrompt } from "../prompts/rebuildConversationPrompt";
import { OpenaiService } from "../../../services/OpenaiService";
import { ConversationsData, RebuiltPhoneLog } from "../types";

const openaiProvider = new OpenaiService();

const rebuildConversation = async (conversation: string) => {
  try {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: rebuildConversationPrompt(),
      },
      { role: "user", content: conversation },
    ];

    const modelResponse = (await openaiProvider.getCompletion({
      jsonMode: true,
      messages,
    })) as ChatCompletion;

    const result = modelResponse.choices[0].message.content;
    const parsedResult = JSON.parse(result!);
    console.log(JSON.stringify(parsedResult, null, 2));
    return result;
  } catch (error) {
    console.error("Error while rebuilding the conversation: ", error);

    throw new Error("Error!");
  }
};

export const fixPhoneLogs = async (
  conversationsStr: string,
): Promise<Record<string, RebuiltPhoneLog>> => {
  const results: Record<string, RebuiltPhoneLog> = {};

  const conversations: ConversationsData = JSON.parse(conversationsStr);

  const { reszta, ...conversationsList } = conversations;

  for (const [key, conversation] of Object.entries(conversationsList)) {
    if (typeof conversation === "object" && !Array.isArray(conversation)) {
      const conversationData = {
        ...conversation,
        possible_messages: reszta,
      };

      const rebuiltConversationStr = await rebuildConversation(
        JSON.stringify(conversationData),
      );

      if (rebuiltConversationStr) {
        const parsedConversation = JSON.parse(rebuiltConversationStr);

        results[key] = {
          messages: parsedConversation,
          length: conversation.length,
        };
      }
    }
  }

  return results;
};
