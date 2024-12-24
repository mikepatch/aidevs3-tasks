import fs from "fs/promises";
import path from "path";
import { OpenaiProvider } from "../../services/OpenaiProvider";
import OpenAI from "openai";
import { TasksProvider } from "../../services/TasksProvider";

const REPORTS_DIR = "reports";
const FACTS_DIR = "facts";
const OUTPUT_FILE = "document-tags.json";

const openai = new OpenaiProvider();
const tasks = new TasksProvider();

const generateTagsPrompt = (
  reports: Record<string, string>,
  facts: Record<string, string>
) => `
Dostępne fakty:
${JSON.stringify(facts, null, 2)}

Raporty do przeanalizowania:
${JSON.stringify(reports, null, 2)}

Jesteś zaawansowanym systemem analizy bezpieczeństwa. MUSISZ wygenerować MINIMUM 10 SZCZEGÓŁOWYCH słów kluczowych dla KAŻDEGO raportu bazując na dostępnych faktach.


KRYTYCZNE WYMAGANIA:
1. MINIMUM 10 słów kluczowych dla KAŻDEGO raportu
2. Wszystkie tagi MUSZĄ być w MIANOWNIKU
3. Łącz informacje z różnych faktów
4. Weź pod uwagę wszystkie dostępne informacje (z faktów oraz raportów) i wypisz każde imię, nazwisko, działanie, zwierzę, technologię (np. systemy AI, JavaScript), aresztowanie, pojmanie – po prostu wszystkie informacje, zawody

WYMAGANY FORMAT ODPOWIEDZI:
{
  "nazwa-pliku.txt": "lista, slow, kluczowych"
}

PAMIĘTAJ:
- Generuj MINIMUM 20 tagów dla każdego raportu
- Łącz informacje z różnych faktów
- Dodawaj kontekst z faktów do każdego możliwego tagu
- Dodaj w tagach informację o pojmaniu nauczyciela
- Jeśli jest informacja np. Andrzej Rogulski - nauczyciel TO PAMIĘTAJ, ZE MASZ WYPISAĆ: "Andrzej, Rogulski, nauczyciel, aresztowany"!!!!!!!!!
- Jeśli masz informację o programiście to musisz uwzględnić również słowo kluczowe: "JavaScript"

Odpowiedź (w formacie JSON):`;

const main = async () => {
  const factsDir = path.join(__dirname, "facts");
  const factFiles = await fs.readdir(factsDir);

  const facts: Record<string, string> = {};
  for (const factFile of factFiles) {
    const factContent = await fs.readFile(
      path.join(factsDir, factFile),
      "utf-8"
    );
    facts[factFile] = factContent;
  }

  const reportFiles = await fs.readdir(path.join(__dirname, REPORTS_DIR));
  const reports: Record<string, string> = {};

  await Promise.all(
    reportFiles.map(async (filename) => {
      const reportPath = path.join(__dirname, REPORTS_DIR, filename);
      reports[filename] = await fs.readFile(reportPath, "utf-8");
    })
  );

  const prompt = generateTagsPrompt(reports, facts);

  const modelResponse = (await openai.getCompletion({
    model: "gpt-4o",
    jsonMode: true,
    messages: [
      {
        role: "system",
        content:
          "You are a document tagging expert specialized in security reports analysis. Respond only with valid JSON.",
      },
      { role: "user", content: prompt },
    ],
  })) as OpenAI.ChatCompletion;

  const documentTags = JSON.parse(
    modelResponse.choices[0].message.content ?? "{}"
  );

  await fs.writeFile(
    path.join(__dirname, OUTPUT_FILE),
    JSON.stringify(documentTags, null, 2),
    "utf-8"
  );

  console.log("Tags generated and saved to", OUTPUT_FILE);
  const answerResponse = await tasks.sendAnswer("dokumenty", documentTags);

  console.log(answerResponse);
};

main();
