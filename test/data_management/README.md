# Usage Documentation for TestRail Import and Export Scripts

This document provides detailed instructions on how to use the `import_data_to_testrail.js` and `export_data_from_testrail.js` scripts to handle TestRail data.

---

## Prerequisites

1. **Node.js Installed**: Ensure you have Node.js installed on your system.
2. **Dependencies Installed**: Run `npm install` to install all required dependencies before using the scripts.
3. **Environment Configuration**: Create a `.env` file in the current directory to securely store TestRail credentials. Example:
   ```env
   TESTRAIL_HOST=https://your-instance.testrail.io
   TESTRAIL_USERNAME=your_username
   TESTRAIL_PASSWORD=your-password or your_api_key
   ```

   > **Note**: API key can be generated from TestRail under `My Settings > API Key` (https://your-instance.testrail.io/index.php?%2Fmysettings=#).
4. **Configuration Loader**: Ensure the `dotenv` package is installed to load environment variables. Run:
   ```bash
   npm install
   ```

---

## Export Script: `export_data_from_testrail.js`

### Purpose
The export script fetches data from TestRail projects and saves it to a JSON file.

### Command Syntax
```bash
node export_data_from_testrail.js
```

You can also specify a custom file path using the `-f` flag:
```bash
node export_data_from_testrail.js -f <filepath>
```
Example:
```bash
node export_data_from_testrail.js -f testrail_data.json
```

### Output
- By default, the data is exported to `testrail_data.json` in the current directory.
- The JSON structure contains projects, suites, sections, and test cases.

### Notes on Exporting
1. **Suite Mode 1** (Single Repository):
   - The script fetches the default repository and all sections with test cases.
   - All sections are added to the default repository without nesting.
2. **Suite Mode 2** (Single Repository with Baselines):
   - The script fetches the default repository (`Master`) and all baselines.
   - It merges them into a single suite under the `Master` suite.

---

## Import Script: `import_data_to_testrail.js`

### Purpose
The import script reads a JSON file and recreates the projects, suites, sections, and test cases in TestRail.

### Command Syntax
```bash
node import_data_to_testrail.js
```

You can also specify a custom file path using the `-f` flag:
```bash
node import_data_to_testrail.js -f <filepath>
```
Example:
```bash
node import_data_to_testrail.js -f testrail_data.json
```

### Notes on Importing

#### Suite Modes
1. **Suite Mode 1** (Single Repository):
   - A default suite is created for each project.
   - All sections and cases are added to the default suite without nesting.

2. **Suite Mode 2** (Single Repository with Baselines):
   - A default suite (`Master`) is created.
   - Additional suites (baselines) and their respective sections and cases are added under the default suite.

#### Error Handling
- If the `-f` flag is not followed by a valid file path, an error will be thrown.
- The script checks for file existence before proceeding.
- If a project, suite, or section cannot be created, the script logs the error and continues with the next item.

---

