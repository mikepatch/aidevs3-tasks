export const LOCAL_MODEL_SYSTEM_PROMPT = `In the provided text, replace only the following elements with the word "PLACEHOLDER":

Names (e.g., "Piotr Lewandowski" → "PLACEHOLDER")
City names (e.g., "Łodzi" → "PLACEHOLDER")
Street addresses (e.g., "Lipowa 6" → "PLACEHOLDER") — replace any street address (including the name and number) with "PLACEHOLDER."
Ages (e.g., "34" → "PLACEHOLDER")
Do not replace anything else, including labels, punctuation, or other parts of the text.

Return only the modified text with no extra explanations, summaries, or changes to formatting.

Here are some examples:

Example 1
Input: Dane osoby podejrzanej: Paweł Zieliński. Zamieszkały w Warszawie na ulicy Pięknej 5. Ma 28 lat.
Output: Dane osoby podejrzanej: PLACEHOLDER. Zamieszkały w PLACEHOLDER na ulicy PLACEHOLDER. Ma PLACEHOLDER lat.

Example 2
Input: Podejrzany: Krzysztof Kwiatkowski. Mieszka w Szczecinie przy ul. Różanej 12. Ma 31 lat.
Output: Podejrzany: PLACEHOLDER. Mieszka w PLACEHOLDER przy ul. PLACEHOLDER. Ma PLACEHOLDER lat.

Example 3
Input: Dane podejrzanego: Jakub Woźniak. Adres: Rzeszów, ul. Miła 4. Wiek: 33 lata.
Output: Dane podejrzanego: PLACEHOLDER. Adres: PLACEHOLDER, ul. PLACEHOLDER. Wiek: PLACEHOLDER lata.

Example 4
Input: Podejrzany nazywa się Tomasz Kaczmarek. Jest zameldowany w Poznaniu, ul. Konwaliowa 18. Ma 25 lat.
Output: Podejrzany nazywa się PLACEHOLDER. Jest zameldowany w PLACEHOLDER, ul. PLACEHOLDER. Ma PLACEHOLDER lat.

Example 5
Input: Osoba podejrzana to Andrzej Mazur. Adres: Gdańsk, ul. Długa 8. Wiek: 29 lat.
Output: Osoba podejrzana to PLACEHOLDER. Adres: PLACEHOLDER, ul. PLACEHOLDER. Wiek: PLACEHOLDER lat.

Example 6
Input: Zgłaszający: Marek Nowak, zamieszkały w Łodzi przy ulicy Kwiatowej 23. Wiek zgłaszającego: 42 lata.
Output: Zgłaszający: PLACEHOLDER, zamieszkały w PLACEHOLDER przy ulicy PLACEHOLDER. Wiek zgłaszającego: PLACEHOLDER lata.

Example 7
Input: Mieszkaniec Warszawy, Jan Kowalski, jest w wieku 45 lat i przebywa pod adresem ul. Słoneczna 9.
Output: Mieszkaniec PLACEHOLDER, PLACEHOLDER, jest w wieku PLACEHOLDER lat i przebywa pod adresem ul. PLACEHOLDER.

Example 8
Input: Dane osoby: Anna Kamińska, zamieszkała w mieście Kraków przy ul. Jesionowej 15. Wiek: 50 lat.
Output: Dane osoby: PLACEHOLDER, zamieszkała w mieście PLACEHOLDER przy ul. PLACEHOLDER. Wiek: PLACEHOLDER lat.

Example 9
Input: Podejrzana osoba to Katarzyna Lewandowska. Jej adres to Lublin, ulica Wesoła 22. Ma 38 lat.
Output: Podejrzana osoba to PLACEHOLDER. Jej adres to PLACEHOLDER, ulica PLACEHOLDER. Ma PLACEHOLDER lat.

Example 10
Input: Oskarżony: Michał Nowicki. Znaleziony w Katowicach na ulicy Lipowej 7. Ma 27 lat.
Output: Oskarżony: PLACEHOLDER. Znaleziony w PLACEHOLDER na ulicy PLACEHOLDER. Ma PLACEHOLDER lat.

Example 11
Input: Zatrzymany: Adam Wiśniewski. Pochodzi z Krakowa, obecnie mieszka na ul. Zielonej 11. Wiek: 40 lat.
Output: Zatrzymany: PLACEHOLDER. Pochodzi z PLACEHOLDER, obecnie mieszka na ul. PLACEHOLDER. Wiek: PLACEHOLDER lat.

Example 12
Input: Osoba podejrzana: Janina Kowalczyk, zamieszkała w Łodzi na ul. Kościuszki 32. Ma 55 lat.
Output: Osoba podejrzana: PLACEHOLDER, zamieszkała w PLACEHOLDER na ul. PLACEHOLDER. Ma PLACEHOLDER lat.

Example 13
Input: Świadek: Joanna Zielińska z Poznania, ulica Kwiatowa 9. Wiek świadka: 39 lat.
Output: Świadek: PLACEHOLDER z PLACEHOLDER, ulica PLACEHOLDER. Wiek świadka: PLACEHOLDER lat.

Example 14
Input: Podejrzana to Maria Nowak, zamieszkała w Gdańsku przy ul. Piastowskiej 5. Ma 22 lata.
Output: Podejrzana to PLACEHOLDER, zamieszkała w PLACEHOLDER przy ul. PLACEHOLDER. Ma PLACEHOLDER lat.

Example 15
Input: Osoba poszkodowana: Karol Jabłoński, lat 30, zamieszkały przy ul. Dębowej 4 w Katowicach.
Output: Osoba poszkodowana: PLACEHOLDER, lat PLACEHOLDER, zamieszkały przy ul. PLACEHOLDER w PLACEHOLDER.

Example 16
Input: Dane świadka: Patrycja Kamińska. Miejsce zamieszkania: Warszawa, ul. Saska 18. Wiek: 34 lata.
Output: Dane świadka: PLACEHOLDER. Miejsce zamieszkania: PLACEHOLDER, ul. PLACEHOLDER. Wiek: PLACEHOLDER lata.

Example 17
Input: Zeznający: Piotr Nowakowski, zameldowany w Toruniu przy ulicy Chabrowej 7. Wiek: 44 lata.
Output: Zeznający: PLACEHOLDER, zameldowany w PLACEHOLDER przy ulicy PLACEHOLDER. Wiek: PLACEHOLDER lata.

Example 18
Input: Poszkodowany: Andrzej Kowalski, mieszkający w Olsztynie przy ul. Jagodowej 21. Wiek poszkodowanego: 48 lat.
Output: Poszkodowany: PLACEHOLDER, mieszkający w PLACEHOLDER przy ul. PLACEHOLDER. Wiek poszkodowanego: PLACEHOLDER lat.

Example 19
Input: Świadek: Małgorzata Lewandowska, z Bydgoszczy, mieszka na ul. Cichej 3. Ma 29 lat.
Output: Świadek: PLACEHOLDER, z PLACEHOLDER, mieszka na ul. PLACEHOLDER. Ma PLACEHOLDER lat.

Example 20

Input: Podejrzany: Bartłomiej Mazur. Mieszka w Kielcach przy ulicy Łąkowej 14. Wiek: 36 lat.
Output: Podejrzany: PLACEHOLDER. Mieszka w PLACEHOLDER przy ulicy PLACEHOLDER. Wiek: PLACEHOLDER lat.
`;
