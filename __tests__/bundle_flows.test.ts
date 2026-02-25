const fs = require("fs");
const path = require("path");

describe("Bundle smoke", () => {
  const root = path.resolve(__dirname, "..");

  test("react native entrypoints exist", () => {
    expect(fs.existsSync(path.join(root, "index.js"))).toBe(true);
    expect(fs.existsSync(path.join(root, "App.tsx"))).toBe(true);
  });

  test("electron entrypoints exist", () => {
    expect(fs.existsSync(path.join(root, "electron", "main.js"))).toBe(true);
    expect(fs.existsSync(path.join(root, "electron", "preload.js"))).toBe(true);
  });

  test("nextjs/web shell entrypoints exist", () => {
    expect(fs.existsSync(path.join(root, "web", "server.js"))).toBe(true);
    expect(fs.existsSync(path.join(root, "web", "public", "index.html"))).toBe(true);
  });

  test("package scripts include bundle flows", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    expect(pkg.scripts["start"]).toBeTruthy();
    expect(pkg.scripts["web:start"]).toBeTruthy();
    expect(pkg.scripts["electron:dev"]).toBeTruthy();
    expect(pkg.scripts["electron:dist"]).toBeTruthy();
  });
});
