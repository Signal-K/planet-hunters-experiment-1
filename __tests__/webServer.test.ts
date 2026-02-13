const path = require("path");
const { createRequestHandler, resolveSafePath } = require("../web/server.js");

function invokeRequest(pathname) {
  return new Promise((resolve) => {
    const request = {
      method: "GET",
      url: pathname,
    };
    const response = {
      statusCode: 0,
      headers: {},
      body: "",
      writeHead(statusCode, headers) {
        this.statusCode = statusCode;
        this.headers = headers || {};
      },
      end(payload) {
        this.body = payload || "";
        resolve({ statusCode: this.statusCode, headers: this.headers, body: this.body });
      },
    };
    const handler = createRequestHandler();
    handler(request, response);
  });
}

describe("web server", () => {
  it("blocks traversal outside root", () => {
    const root = path.resolve(process.cwd(), "web", "public");
    expect(resolveSafePath(root, "../../etc/passwd")).toBeNull();
  });

  it("returns health status", async () => {
    const res = await invokeRequest("/healthz");
    expect(res.statusCode).toBe(200);
    const payload = JSON.parse(res.body);
    expect(payload.ok).toBe(true);
    expect(typeof payload.gameIndexExists).toBe("boolean");
  });
});
