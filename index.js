// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const TOKEN_EXPIRY_BUFFER = 3500 * 1000;

var authConfig = {
  client_id: "", // RClone client_id
  client_secret: "", // RClone client_secret
  refresh_token: "", // unique
  root: "allDrives",
};

let gd;

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

let linksHtml = `
<!DOCTYPE html>
<html lang="en">
 <head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0,maximum-scale=1.0, user-scalable=no" />
  <title>GLOBAL INDEXER</title>
  <link rel="shortcut icon" href="https://raw.githubusercontent.com/cheems/goindex-extended/master/images/favicon-x.png" type="image/x-icon" />
  <style>
   @import url("https://fonts.googleapis.com/css?family=Londrina+Outline");
   @import url("https://fonts.googleapis.com/css2?family=Gemunu+Libre:wght@700&display=swap");

   * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
   }
   body {
    background: #202020;
    display: fixed;
    justify-content: center;
    align-items: center;
    margin: 10px;
    padding-top: 15px;
    margin-top: 10px;
   }
   #box {
    border: 4px solid #4caf50;
    border-radius: 45px;
    background: #8c7373;
    box-shadow: 6px 6px 6px rgba(0, 0, 0, 0.712), -6px -6px 6px rgba(182, 182, 182, 0.075);
    width: auto;
    padding: 2.8rem;
   }
   .neon {
    font-family: "Londrina Outline", cursive;
    text-align: center;
    text-transform: uppercase;
    font-size: 6em;
    color: #fff;
    letter-spacing: 0.15em;
   }
   .pink {
    text-shadow: 0 0 5px #ff7bac, 0 0 10px #ff7bac, 0 0 20px #ff7bac, 0 0 40px #ff7bac, 0 0 80px #ff7bac, 0 0 90px #ff7bac, 0 0 100px #ff7bac, 0 0 150px #ff7bac;
   }

   a {
    text-decoration: none;
    color: white;
    text-transform: uppercase;
    font-family: "Gemunu Libre", sans-serif;
    text-align: center;
    word-wrap: break-word;
   }
   *:before,
   *:after {
    content: "";
   }
   hr {
    border: 0;
    margin: 1.35em auto;
    max-width: 100%;
    background-position: 50%;
    box-sizing: border-box;
   }

   form {
    max-width: 600px;
    margin: 20px auto;
   }

   .input-group {
    display: flex;
    border: 1px solid #ccc;
    border-radius: 30px;
    overflow: hidden;
    margin-bottom: 20px;
    background-color: #fff;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
   }

   .form-control {
    flex-grow: 1;
    padding: 15px 20px;
    border: 0;
    font-size: 16px;
    outline: none;
   }

   .btn {
    padding: 15px 20px;
    border: 0;
    background: #007bff;
    color: #fff;
    cursor: pointer;
    transition: background 0.3s ease;
   }

   .btn:hover {
    background: #0056b3;
   }
  </style>
 </head>
 <body>
  <main>
   <h1 class="neon pink">INDEX</h1>
  </main>
  <form action="/search/" method="get">
   <div class="input-group">
    <input type="text" name="q" class="form-control" placeholder="Search here..." required />
    <button class="btn btn-primary" type="submit">Search</button>
   </div>
  </form>
  <form action="/searchjson/" method="get">
   <div class="input-group">
    <input type="text" name="q" class="form-control" placeholder="Search JSON here..." required />
    <button class="btn btn-danger" type="submit">JSON</button>
   </div>
  </form>
  <div id="box">
   SEARCH_RESULT_PLACEHOLDER
  </div>
 </body>
</html>
`;

/**
 * Fetch and log a request
 * @param {Request} request
 */
async function handleRequest(request) {
  if (gd === undefined) {
    gd = new googleDrive(authConfig);
  }

  let url = new URL(request.url);
  let path = url.pathname;
  let action = url.searchParams.get("a");
  let baseUrl = url.toString().replace(path, "/");

  // Handle search requests
  if (path === "/" || path.startsWith("/search/")) {
    let query = url.searchParams.get("q"); // Get query from URL
    if (query) {
      path = "/search/" + encodeURIComponent(query); // Append query to path
    }
    try {
      return await handleSearch(path, baseUrl, linksHtml);
    } catch (error) {
      return handleError(error);
    }
  } else if (path.startsWith("/searchjson/")) {
    let query = url.searchParams.get("q"); // Get query from URL
    if (query) {
      path = "/searchjson/" + encodeURIComponent(query); // Append query to path
    }
    try {
      return await handleSearchJSON(path, baseUrl);
    } catch (error) {
      return handleError(error);
    }
  } else {
    // If client requests a file
    let file = await gd.getFilesCached(path);
    file = file[0];
    let range = request.headers.get("Range");
    return gd.down(file.id, range);
  }
}

async function handleSearch(path, baseUrl, linksHtml) {
  let file = await gd.getFilesCached(path);
  if (!file) {
    throw new Error("Could not load the search results");
  }

  file.forEach(function (f) {
    let link = baseUrl + encodeURIComponent(f.name);
    linksHtml = linksHtml.replace("SEARCH_RESULT_PLACEHOLDER", `<a href="${link}">NAME: ${f.name} <br> SIZE: ${f.size}</a><br><br>\nSEARCH_RESULT_PLACEHOLDER`);
  });

  linksHtml = linksHtml.replace("SEARCH_RESULT_PLACEHOLDER", "");
  return new Response(linksHtml, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function handleSearchJSON(path, baseUrl) {
  const response = [];
  let file = await gd.getFilesCached(path);
  if (!file) {
    throw new Error("Could not load the search results");
  }

  file.forEach(function (f) {
    let link = baseUrl + encodeURIComponent(f.name);
    let size = Math.round((f.size / 2 ** 30) * 100) / 100;
    let result = { link: link, size_gb: size, file_id: f.id, drive_id: f.driveId };
    response.push(result);
  });

  return new Response(JSON.stringify(response), { status: 200, headers: { "Content-Type": "application/json" } });
}

// Function to handle errors
function handleError(error) {
  return new Response(error.message, {
    status: 500,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// Class to handle operations related to Google Drive
class googleDrive {
  constructor(authConfig) {
    this.authConfig = authConfig;
    this.paths = [];
    this.files = [];
    this.paths["/"] = authConfig.root;

    // Initiate token fetch upon instantiation
    this.accessToken();
  }

  async fetchAndRetryOnError(url, requestOption, maxRetries = MAX_RETRIES) {
    let response = await fetch(url, requestOption);
    let retries = 0;
    while (!response.ok && response.status != 400 && retries < maxRetries) {
      await sleep(RETRY_DELAY + RETRY_DELAY * 2 ** retries);
      retries += 1;
      response = await fetch(url, requestOption);
    }
    return response;
  }

  async down(id, range = "") {
    let url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
    let requestOption = await this.requestOption();
    requestOption.headers["Range"] = range;
    return await this.fetchAndRetryOnError(url, requestOption);
  }

  async getFilesCached(path) {
    if (typeof this.files[path] == "undefined") {
      let files = await this.getFiles(path);
      if (files !== "FAILED") {
        this.files[path] = files;
      }
    }
    return this.files[path];
  }

  getSearchScopeParams() {
    let params = { spaces: "drive" };
    if (authConfig.root === "allDrives") {
      params = {
        corpora: "allDrives",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        pageSize: 1000,
      };
    } else if (authConfig.root !== "") {
      params = {
        spaces: "drive",
        corpora: "drive",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        driveId: authConfig.root,
      };
    }
    return params;
  }

  async getFiles(path) {
    let arr = path.split("/");
    let name = arr.pop();
    name = decodeURIComponent(name).replace(/'/g, "\\'");

    let url = "https://www.googleapis.com/drive/v3/files";
    let params = this.getSearchScopeParams();

    params.q = `fullText contains '${name}' and (mimeType contains 'application/octet-stream' or mimeType contains 'video/') and (name contains 'mkv' or name contains 'mp4' or name contains 'avi') `;
    params.fields = "files(id, name, size, driveId)";

    url += "?" + this.enQuery(params);
    let requestOption = await this.requestOption();
    let response = await this.fetchAndRetryOnError(url, requestOption);

    let obj = await response.json();

    if (response.ok) {
      return obj.files;
    } else {
      return "FAILED";
    }
  }

  async accessToken() {
    if (this.authConfig.expires === undefined || this.authConfig.expires < Date.now()) {
      const obj = await this.fetchAccessToken();
      if (obj.access_token !== undefined) {
        this.authConfig.accessToken = obj.access_token;
        this.authConfig.expires = Date.now() + TOKEN_EXPIRY_BUFFER;
      }
    }
    return this.authConfig.accessToken;
  }

  async fetchAccessToken() {
    const url = "https://www.googleapis.com/oauth2/v4/token";
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    const post_data = {
      client_id: this.authConfig.client_id,
      client_secret: this.authConfig.client_secret,
      refresh_token: this.authConfig.refresh_token,
      grant_type: "refresh_token",
    };

    let requestOption = {
      method: "POST",
      headers: headers,
      body: this.enQuery(post_data),
    };

    const response = await this.fetchAndRetryOnError(url, requestOption);
    return await response.json();
  }

  async requestOption(headers = {}, method = "GET") {
    const accessToken = await this.accessToken();
    headers["authorization"] = "Bearer " + accessToken;
    return { method: method, headers: headers };
  }

  enQuery(data) {
    const ret = [];
    for (let d in data) {
      ret.push(encodeURIComponent(d) + "=" + encodeURIComponent(data[d]));
    }
    ret.push(encodeURIComponent("acknowledgeAbuse") + "=" + encodeURIComponent("true"));
    return ret.join("&");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
