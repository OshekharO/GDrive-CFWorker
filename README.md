# 🚀 GDrive-CFWorker

A Cloudflare Worker that provides direct links to files on Google Drive. 📂

This worker can search through all your drives (including shared drives), and returns the search results in plaintext or in JSON format. 📚🔍

## 🛠️ Setup

1. **Create a new Google Cloud Platform project.**
    - Visit the [Google Cloud Console](https://console.developers.google.com/).
    - Click the project drop-down and select **New Project**.
    - Enter a project name and click **Create**.

2. **Enable the Google Drive API for the project.**
    - In the Cloud Console, go to the **Dashboard** and click **Enable APIs and Services**.
    - Search for "Google Drive" and select the **Google Drive API**.
    - Click **Enable**.

3. **Create credentials for the Google Drive API.**
    - Go to the **Credentials** section.
    - Click **Create credentials**, then select **OAuth client ID**.
    - Set the application type to **Other**.
    - Enter a name for the OAuth client ID, then click **Create**.

4. **Obtain the client ID and client secret.**
    - After the OAuth client is created, you'll be able to see your client ID and client secret.

5. **Fill the details in the script [index.js](https://github.com/OshekharO/GDrive-CFWorker/blob/main/index.js).**
    - Provide your client ID, client secret and Google account's refresh token.

6. **Create your Cloudflare Worker.**
    - Go to the Cloudflare Workers page and create a new worker.
    - Replace the existing worker script with the index script.
    - Take note of the worker's URL, which looks like `https://x.y.workers.dev`.

And that's it! 🎉 You're now ready to use your Cloudflare Worker with Google Drive.

## 🚀 Usage

After you create the Cloudflare Worker, take note of its URL which looks like `https://x.y.workers.dev`. You can change this URL on the Cloudflare Workers page, but make sure it's non-guessable. 🔒

Here are the requests you can make to this URL:

| GET request | Response |
| ------------- | ------------- |
| `https://x.y.workers.dev/search/*SomeSearchQuery*`  | Search results on an HTML page 📃 |
| `https://x.y.workers.dev/searchjson/*SomeSearchQuery*`  | Search results in JSON format 📄 |

## 🙏 Credits

This project builds upon the work of:

- [maple3142](https://github.com/maple3142/GDIndex)
- [thim0o](https://github.com/thim0o/gdrive-cfworker-videostream/)
- [ChatGPT]()
