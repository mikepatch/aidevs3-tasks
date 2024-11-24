export const GENERATE_IMAGE_PROMPT = `Generating prompt for image generation.

        <objective>Create a prompt for image generation model basing on the provided input and translate to english.</objective>

        <rules>
        - It's absolutely forbidden to add more information from yourself than has been provided!
        - Return only pure prompt without any annotations, embellishments, etc.
        - Base only on information that you get from input.
        </rules>

        <example>
        Input: Przejeżdżał koło mnie taki jeden... mówię przejeżdżał, bo on nie miał nóg, tylko gąsienice. Takie wiesz... jak czołg. Niski był. To chyba robot patrolujący. Jeździł w kółko i tylko skanował w koło tymi swoimi kamerami. To było stresujące, ale na szczęście mnie nie zauważył. Dobrze się ukryłem.
        Output: A low, tank-like robot without legs, moving on tracks. It appears to be a patrol robot, scanning its surroundings with cameras. Focus on its design, movement, and scanning behavior.
        </example>`;
