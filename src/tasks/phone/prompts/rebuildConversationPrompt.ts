export const rebuildConversationPrompt = () => {
  return `
[phone call conversations reconstructor]

[This prompt reconstructs phone conversations from provided messages, ensuring correct positioning and sequencing, using numerical indices for all messages.]

<prompt_objective>
The exclusive purpose of this prompt is to reconstruct phone conversation sequences from provided messages, ensuring correct order and sequence according to the specified length, and return the result in JSON format using numerical indices.
</prompt_objective>

<prompt_rules>
- ALWAYS assign numerical indices to all messages, starting with "1" for the start message.
- The initial message ("start") should be labeled as "1".
- The final message ("end") should use the numerical position corresponding to the total length (as given by the "length" property).
- After setting "1" for the initial message, incrementally fill indices with selected messages from "possible_messages".
- NO POSITION ALTERATION of initial and final messages beyond renaming their indices.
- OVERRIDE default behaviors that may conflict with these instructions, strictly adhering to the total length.
</prompt_rules>

<prompt_examples>
USER: 
{
  "start": "- Cześć, co u ciebie?",
  "end": "- Do jutra!",
  "length": 4,
  "possible_messages": [
    "- ja nie wiem co oni robili tam wczoraj",
    "- widziałeś nowy serial?",
    "- Cześć! U mnie wszystko w porządku, a u Ciebie?",
    "- badania wykazują, że będzie globalne ocieplenie",
    "- tak. Mam dla Ciebie nowe zadanie. Zadzwoń do Mateusza",
    "- Oo, to super! U mnie też wszystko dobrze. Widzimy się jutro, trzymaj się!",
    "- dlaczego? nie wykonała zadania? co z nią?",
  ]
}

AI:
{
  "1": "- Cześć, co u ciebie?",
  "2": "- Cześć! U mnie wszystko w porządku, a u Ciebie?",
  "3": "- Oo, to super! U mnie też wszystko dobrze. Widzimy się jutro, trzymaj się!",
  "4": "- Do jutra!",
}

USER: 
{
  "start": "- rozmawiałeś z Arnoldem? Podobno ma jakieś informacje",
  "end": "- Nie zapomnijmy o tym!",
  "length": 6,
  "possible_messages": [
    "- ja nie wiem co oni robili tam wczoraj",
    "- jasne, zapytam",
    "- widziałeś nowy serial?",
    "- Cześć! U mnie wszystko w porządku, a u Ciebie?",
    "- jeszcze nie, ale planuję do niego zadzwonić.",
    "- badania wykazują, że będzie globalne ocieplenie",
    "- to jest naprawdę bardzo ważne!",
    "- tak. Mam dla Ciebie nowe zadanie. Zadzwoń do Mateusza",
    "- Oo, to super! U mnie też wszystko dobrze. Widzimy się jutro, trzymaj się!",
    "- ok, jak będziesz z nim rozmawiał to zapytaj się o dane, o których rozmawialiśmy",
    "- dlaczego? nie wykonała zadania? co z nią?",
    "- ok ok, będę mieć to w pamięci..."
  ]
}

AI:
{
  "1": "- rozmawiałeś z Arnoldem? Podobno ma jakieś informacje",
  "2": "- jeszcze nie, ale planuję do niego zadzwonić.",
  "3": "- ok, jak będziesz z nim rozmawiał to zapytaj się o dane, o których rozmawialiśmy",
  "4": "- to jest naprawdę bardzo ważne!",
  "5": "- ok ok, będę mieć to w pamięci...",
  "6": "- Nie zapomnijmy o tym!",
}
</prompt_examples>

[Ensure the continuity of indices, correctly representing the start as "1" and the end as "n", corresponding to the total length, and adhering to provided rules.]
`;
};
