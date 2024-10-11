import fs from "fs";

// Removes the seconds from a given timestamp formatted string
export function removeSeconds(testRunName) {
  return testRunName.replace(/:\d{2}$/, ""); // Removes the last two digits representing seconds
}

// Creates a backup of the given configuration file
export function backupConfig(configPath) {
  const backupConfigPath = configPath.replace(".js", ".backup.js");
  const originalConfig = fs.readFileSync(configPath, "utf-8");
  fs.writeFileSync(backupConfigPath, originalConfig);
}

// Modifies the configuration file with the provided changes
export function modifyConfig(configPath, changedConfig) {
  const configString = `module.exports = ${JSON.stringify(
    changedConfig,
    null,
    2
  )};`;
  fs.writeFileSync(configPath, configString);
}

// Restores the configuration file from the backup file
export function restoreConfig(configPath) {
  const backupConfigPath = configPath.replace(".js", ".backup.js");
  const backupConfig = fs.readFileSync(backupConfigPath, "utf-8");
  fs.writeFileSync(configPath, backupConfig);
}

// Delays execution for the specified time in milliseconds
export async function delay(timeInMs) {
  if (timeInMs >= 1 && timeInMs <= 59) {
    timeInMs *= 1000; // Convert seconds to milliseconds
  } else if (timeInMs > 59) {
    timeInMs *= 1000 * 60; // Convert minutes to milliseconds
  }
  return new Promise((resolve) => setTimeout(resolve, timeInMs));
}
