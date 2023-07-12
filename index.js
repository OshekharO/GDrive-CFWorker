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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Links</title>
    <!-- CSS only -->
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/5.1.0/css/bootstrap.min.css" />
  </head>
  <body class="container py-5">
    <h1 class="mb-4">Search Files</h1>
    <form action="/search/" method="get" class="mb-4">
      <div class="input-group">
        <input type="text" name="q" class="form-control" placeholder="Search here..." required />
        <button class="btn btn-primary" type="submit">Search</button>
      </div>
    </form>
    <form action="/searchjson/" method="get">
      <div class="input-group">
        <input type="text" name="q" class="form-control" placeholder="Search JSON here..." required />
        <button class="btn btn-primary" type="submit">Search JSON</button>
      </div>
    </form>
    SEARCH_RESULT_PLACEHOLDER

    <!-- JS, Popper.js, and jQuery -->
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.0/dist/js/bootstrap.bundle.min.js"></script>
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
    linksHtml = linksHtml.replace("SEARCH_RESULT_PLACEHOLDER", `<a href="${link}">${f.name} ${f.size}</a><br><br>\nSEARCH_RESULT_PLACEHOLDER`);
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
