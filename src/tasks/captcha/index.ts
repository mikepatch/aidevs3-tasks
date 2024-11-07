import { getCaptchaAnswer, getCaptchaQuestion, signIn } from "./tools";

(async () => {
  const captchaQuestion = await getCaptchaQuestion();
  const captchaAnswer = await getCaptchaAnswer(captchaQuestion);

  console.log({ captchaQuestion, captchaAnswer });

  const credentials = {
    username: "tester",
    password: "574e112a",
    answer: parseInt(captchaAnswer),
  };

  const result = await signIn(credentials);
  console.log(result);
})();
