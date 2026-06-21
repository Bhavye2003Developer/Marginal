// jest.config.ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  setupFilesAfterEnv: ["./jest.setup.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {}],
    "^.+\\.(?:js|mjs)$": ["babel-jest", {
      presets: [["@babel/preset-env", { targets: { node: "current" } }]],
    }],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@exodus/bytes|parse5|entities|@asamuzakjp|@bramus|css-tree|tough-cookie|@csstools|@adobe|@nodable|@ungap)/)",
  ],
};

export default config;
