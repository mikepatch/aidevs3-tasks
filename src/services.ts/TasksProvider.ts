type AnswerType = string | string[] | number | number[] | object;

class TasksProvider {
  protected API_KEY: string;
  rootUrl: string;

  constructor() {
    this.API_KEY = import.meta.env.AIDEVS_API_KEY;
    this.rootUrl = "https://centrala.ag3nts.org/report";
  }
  async sendAnswer(taskName: string, answer: AnswerType) {
    const options: RequestInit = {
      method: "POST",
      body: JSON.stringify({ task: taskName, apikey: this.API_KEY, answer }),
    };

    return this._fetch(options, `/verify`);
  }

  private async _fetch(options: RequestInit, additionalPath = "") {
    try {
      const url = this.rootUrl + additionalPath;
      const response = await fetch(url, options);

      return response.json();
    } catch (err) {
      throw console.error("Error: ", err);
    }
  }
}

export default new TasksProvider();
