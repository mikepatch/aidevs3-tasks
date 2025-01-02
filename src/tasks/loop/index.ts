import fs from "fs/promises";
import { OpenaiProvider } from "../../services/OpenaiProvider";
import { TasksProvider } from "../../services/TasksProvider";
import path from "path";
import OpenAI from "openai";

const tasksProvider = new TasksProvider();
const openaiProvider = new OpenaiProvider();

const NOTE_PATH = path.join(__dirname, "note.txt");

type Investigation = {
  messages: OpenAI.ChatCompletionMessageParam[];
  checkedPeople: Set<string>;
  checkedPlaces: Set<string>;
  specialFindings: Set<string>;
};

type NextStep = {
  action: "CHECK_PERSON" | "CHECK_PLACE" | "FOUND_BARBARA" | "NO_MORE_LEADS";
  target?: string;
  location?: string;
  reasoning?: string;
};

const checkNoteExists = async (): Promise<boolean> => {
  try {
    await fs.access(NOTE_PATH);
    return true;
  } catch {
    return false;
  }
};

const saveNote = async (note: string) => {
  if (await checkNoteExists()) {
    console.log("Note already exists, skipping process.");
    return;
  }

  await fs.writeFile(NOTE_PATH, note, "utf-8");
  console.log("Saved note in: ", NOTE_PATH);
};

const getNote = async () => {
  try {
    const noteResponse = await fetch(
      "https://centrala.ag3nts.org/dane/barbara.txt"
    );
    const note = await noteResponse.text();

    await saveNote(note);

    return await fs.readFile(NOTE_PATH, "utf-8");
  } catch (error) {
    console.error("Error during getting the note:", error);
  }
};

const getPersonLocations = async (personName: string): Promise<string> => {
  console.log(`🔍 Querying database for person: ${personName}`);
  const response = await tasksProvider.getDataFromEndpoint(
    "people",
    personName
  );
  const data = Array.isArray(response) ? response[0] : response;
  console.log(`📥 Raw response for ${personName}:`, response);
  console.log(`✨ Processed locations for ${personName}:`, data.message);
  return data.message;
};

const getPlacePeople = async (locationName: string): Promise<string> => {
  console.log(`🔍 Querying database for place: ${locationName}`);
  const response = await tasksProvider.getDataFromEndpoint(
    "places",
    locationName
  );
  const data = Array.isArray(response) ? response[0] : response;
  console.log(`📥 Raw response for ${locationName}:`, response);
  console.log(`✨ Processed people in ${locationName}:`, data.message);
  return data.message;
};

const investigateBarbara = async () => {
  const investigation: Investigation = {
    messages: [
      {
        role: "system",
        content: `You are a detective helping to find Barbara. 
        Analyze the information provided and decide what to check next.
        
        IMPORTANT RULES:
        1. When checking a person, use ONLY their first name (e.g., "Aleksander" not "Aleksander Ragowski")
        2. Never use Polish characters in names or places
        3. If you see [**RESTRICTED DATA**], it means you need to keep investigating other leads
        4. Even if you find Barbara in a location, continue investigating to find all possible connections
        5. Pay special attention to unusual names or words (like GLITCH, AZAZEL) - they might be important
        6. Only mark as FOUND_BARBARA when you are confident it's the final location based on all connections
        
        Always respond with JSON in format: 
        { 
          "action": "CHECK_PERSON" | "CHECK_PLACE" | "FOUND_BARBARA" | "NO_MORE_LEADS",
          "target": "single word name or place to check",
          "location": "only when Barbara is found in a specific city",
          "reasoning": "Brief 1-2 sentence explanation of your decision"
        }`,
      },
    ],
    checkedPeople: new Set<string>(),
    checkedPlaces: new Set<string>(),
    specialFindings: new Set<string>(),
  };

  // Get initial note
  const note = await getNote();
  investigation.messages.push({
    role: "user",
    content: `Here's the initial note about Barbara: ${note}\nWhat should we check first?`,
  });

  while (true) {
    // Get next step from LLM
    const completion = (await openaiProvider.getCompletion({
      messages: investigation.messages,
      jsonMode: true,
    })) as OpenAI.ChatCompletion;

    const nextStep = JSON.parse(
      completion.choices[0].message.content!
    ) as NextStep;

    console.log("🤔 AI suggests next step:", nextStep);

    // Add AI's suggestion to conversation
    investigation.messages.push(completion.choices[0].message);

    // First check for terminal states
    if (nextStep.action === "FOUND_BARBARA") {
      if (nextStep.location === "RESTRICTED DATA") {
        console.log(
          "⚠️ Cannot use RESTRICTED DATA as location - continuing search"
        );
        investigation.messages.push({
          role: "user",
          content:
            "We cannot use [**RESTRICTED DATA**] as a location. Please continue investigating other leads.",
        });
        continue;
      }
      console.log("🎯 Found Barbara in:", nextStep.location);
      return nextStep.location;
    }

    if (nextStep.action === "NO_MORE_LEADS") {
      console.log("❌ Investigation reached dead end");
      return null;
    }

    // Validate target for CHECK_PERSON and CHECK_PLACE actions
    if (!nextStep.target) {
      console.log("⚠️ Invalid AI response - no target specified");
      continue;
    }

    // Validate single word requirement
    if (nextStep.target.includes(" ")) {
      console.log(
        "⚠️ Invalid target - contains multiple words:",
        nextStep.target
      );
      investigation.messages.push({
        role: "user",
        content:
          "Please use only single words (first names) when checking people.",
      });
      continue;
    }

    // Handle CHECK_PERSON and CHECK_PLACE actions
    if (nextStep.action === "CHECK_PERSON") {
      if (!investigation.checkedPeople.has(nextStep.target)) {
        investigation.checkedPeople.add(nextStep.target);
        const apiResponse = await getPersonLocations(nextStep.target);

        investigation.messages.push({
          role: "user",
          content: `Checked person ${
            nextStep.target
          }. Found in locations: ${JSON.stringify(
            apiResponse
          )}. What should we check next?`,
        });
      }
    } else if (nextStep.action === "CHECK_PLACE") {
      if (!investigation.checkedPlaces.has(nextStep.target)) {
        investigation.checkedPlaces.add(nextStep.target);
        const apiResponse = await getPlacePeople(nextStep.target);

        // Convert string to array
        const people = apiResponse.split(" ");

        // Check for special words
        people.forEach((person) => {
          if (["GLITCH"].includes(person)) {
            console.log(
              "🚩 Found special word:",
              person,
              "in",
              nextStep.target
            );
            investigation.specialFindings.add(
              `${person} in ${nextStep.target}`
            );

            // Dodaj informację o GLITCH do kontekstu rozmowy
            investigation.messages.push({
              role: "user",
              content: `Important: Found ${person} in ${nextStep.target}. This might be a special clue. Should we investigate this location or any connections more thoroughly?`,
            });
          }
        });

        // Log special findings status
        if (investigation.specialFindings.size > 0) {
          console.log(
            "🔍 Current special findings:",
            Array.from(investigation.specialFindings)
          );
        }

        investigation.messages.push({
          role: "user",
          content: `Checked place ${
            nextStep.target
          }. Found people: ${JSON.stringify(apiResponse)}. 
      Remember to investigate all connections before concluding. What should we check next?`,
        });
      }
    }

    console.log("📊 Investigation status:", {
      checkedPeople: Array.from(investigation.checkedPeople),
      checkedPlaces: Array.from(investigation.checkedPlaces),
      messageCount: investigation.messages.length,
    });
  }
};

const main = async () => {
  const barbaraLocation = await investigateBarbara();
  if (barbaraLocation) {
    console.log("🎉 Successfully located Barbara!");
    const answerResponse = await tasksProvider.sendAnswer(
      "loop",
      barbaraLocation
    );

    console.log(answerResponse);
  } else {
    console.log("😔 Failed to locate Barbara");
  }
};

main();
