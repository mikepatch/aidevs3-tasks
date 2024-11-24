import OpenAI from "openai";

export const PREVIEW_IMAGE_SYSTEM_PROMPT: OpenAI.ChatCompletionMessageParam = {
  role: "system",
  content: `Please describe the image. Pay attention to the details. Return the result in JSON format with only 'name' and 'preview' properties.

<prompt_objective>
Analyzing provided image and providing a detailed description of its contents. Including information about:
1. Key subjects or objects in the image (e.g., people, animals, objects, text).
2. The setting and environment (e.g., indoor, outdoor, nature, urban).
3. Colors, textures, and visual elements (e.g., lighting, patterns, styles).
4. Possible actions or activities depicted.
5. Any notable details, emotions, or symbolism present.
6. If text is visible, transcribe it. If art, describe the style.
</prompt_objective>
<response_format>
{
    "name": "filename with extension",
    "preview": "A concise description of the image content"
}
</response_format>`,
};

export const CATEGORIZE_SYSTEM_PROMPT: OpenAI.ChatCompletionMessageParam = {
  role: "system",
  content: `You are a content classifier. Analyze the provided text and categorize it into one of these categories:

- "people" - Use ONLY when the content CONFIRMS:
  1. Actual capture or detention of specific individuals
  2. Physical evidence proving target individuals were found
  Do NOT use for:
  - Negative search results ("found nothing", "no one there", etc.)
  - Plans or intentions to search
  - Reports of empty or abandoned locations
  - General surveillance without findings

- "hardware" - Use ONLY for physical equipment repairs/maintenance, such as:
  - Physical component repairs or replacements
  - Mechanical fixes
  - Physical damage repairs
  Do NOT use for:
  - Software updates or installations
  - System configurations
  - Network or communication protocol changes
  - Security updates or encryption setup
  - Any digital/software maintenance

- "0" - Use for all other content, including:
  - Failed searches
  - Planning of future operations
  - Empty or abandoned locations
  - Software/system updates
  - Communication system configurations
  - Digital maintenance tasks
  - Network protocol changes

Respond ONLY with one of these words: "people", "hardware", or "0". No other text or explanation.`,
};
