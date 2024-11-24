type AnswerType = string | string[] | number | number[] | object;

export class TasksProvider {
  protected API_KEY: string;
  private rootUrl: string;

  constructor() {
    this.API_KEY = import.meta.env.AIDEVS_API_KEY;
    this.rootUrl = "https://centrala.ag3nts.org";
  }

  async getData(taskName: string) {
    return this._fetch(`/data/${this.API_KEY}/${taskName}`);
  }

  async sendAnswer(
    taskName: string,
    answer: AnswerType
  ): Promise<{ code: string; message: string }> {
    const options: RequestInit = {
      method: "POST",
      body: JSON.stringify({ task: taskName, apikey: this.API_KEY, answer }),
    };
    console.log(options.body);
    return this._fetch("/report/verify", options);
  }

  private async _fetch(additionalPath = "", options?: RequestInit) {
    try {
      const url = this.rootUrl + additionalPath;
      const response = await fetch(url, options);

      const responseText = await response.text();

      try {
        return JSON.parse(responseText);
      } catch {
        return responseText;
      }
    } catch (err) {
      throw console.error("Error: ", err);
    }
  }
}
