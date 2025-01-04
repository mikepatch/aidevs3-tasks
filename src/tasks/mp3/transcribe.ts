import { promises as fs } from "fs";
import path from "path";
import { OpenaiService } from "../../services/OpenaiService";

const openaiProvider = new OpenaiService();

export const transcribe = async () => {
  try {
    const recordingsDir = path.join(__dirname, "recordings");
    const files = await fs.readdir(recordingsDir);
    const transcriptionsDir = path.join(__dirname, "transcriptions");
    await fs.mkdir(transcriptionsDir, { recursive: true });

    const m4aFiles = files.filter((file) =>
      file.toLowerCase().endsWith(".m4a")
    );

    for (const file of m4aFiles) {
      const filePath = path.join(recordingsDir, file);
      const transcriptionFileName = file.replace(".m4a", ".txt");
      const transcriptionPath = path.join(
        transcriptionsDir,
        transcriptionFileName
      );

      try {
        await fs.access(transcriptionPath);
        console.log(`Skipping ${file}: Transcription already exists`);

        continue;
      } catch {
        console.log(`Processing: ${filePath}`);
        const transcription = await openaiProvider.transcribe(filePath);

        await fs.writeFile(transcriptionPath, transcription, "utf-8");
      }
    }
  } catch (error) {
    console.error("Error processing audio files: ", error);
    throw error;
  }
};
