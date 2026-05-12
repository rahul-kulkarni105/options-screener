const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT || 4173),
  isProduction,
  rootDir,
  distDir: path.join(rootDir, "dist"),
  clientRoot: rootDir
};
