#!/usr/bin/env node

let path = require("path");
let fs = require("fs");
let util = require("util");
let exec = util.promisify(require("child_process").exec);
let inquirer = require("inquirer");
require("colors");

async function run() {
  let folderPath = process.cwd();
  let projectPath = __dirname;

  copyFiles(folderPath, projectPath);

  await downloadDependencies(folderPath);

  await buildFunctions(projectPath);

  console.log("✅ Done!".green);
  console.log();

  logEnvVar();
}

run();

/* Internal Functions */

function copyFiles(folderPath, projectPath) {
  let functionsFolderPath = path.join(folderPath, ".functions");

  if (!fs.existsSync(functionsFolderPath)) {
    console.log(
      `⚠️  ${functionsFolderPath.toString()} does not exist. This will store your uncompiled lambda functions. Creating now...`
        .red
    );
    fs.mkdirSync(functionsFolderPath);
  }
  console.log("✏️  Copying lambda funcs to .functions".yellow);
  fs.copyFileSync(
    path.join(projectPath, "templates", "deploy-failed.js"),
    path.join(folderPath, ".functions", "deploy-failed.js")
  );
  fs.copyFileSync(
    path.join(projectPath, "templates", "deploy-succeeded.js"),
    path.join(folderPath, ".functions", "deploy-succeeded.js")
  );
  if (fs.existsSync(path.join(folderPath, "netlify.toml"))) {
    console.log(
      `⚠️  netlify.toml file already exists. In the build section, add the following field:\n     functions = "lambda"`
        .yellow
    );
  } else {
    console.log("✏️  Copying netlify.toml to .".yellow);
    fs.copyFileSync(
      path.join(projectPath, "templates", "netlify.toml"),
      path.join(folderPath, "netlify.toml")
    );
  }
}

async function downloadDependencies(folderPath) {
  console.log("📦 Adding netlify-lambda and lifx-http-api...".cyan);
  console.log("📦 Do you use yarn or npm?");
  let { packageManager } = await inquirer.prompt([
    {
      type: "list",
      name: "packageManager",
      choices: ["npm", "yarn"],
      default: "npm"
    }
  ]);

  let packageJSONPath = path.join(folderPath, "package.json");

  if (!fs.existsSync(packageJSONPath)) {
    console.log("📦 Creating package.json");
    fs.writeFileSync(packageJSONPath, "{}");
  }

  let npmCmd = `${packageManager} add -D netlify-lambda lifx-http-api`;

  console.log(`📦 Running ${npmCmd}`.cyan);

  await exec(npmCmd);

  console.log(`📦 ${packageManager} Done!`.green);
}

async function buildFunctions(projectPath) {
  let netlifyLambdaCmd = path.join(
    projectPath,
    "node_modules",
    ".bin",
    "netlify-lambda"
  );
  let cmd = `${netlifyLambdaCmd} build .functions`;
  console.log(`✏️  Running netlify-lambda...`.cyan);
  let { stdout, stderr } = await exec(cmd);
  if (stdout !== "") {
    console.log(stdout);
  }
  if (stderr !== "") {
    console.error(stderr.red);
  }
}

function logEnvVar() {
  console.log(
    `
📚 The LIFX API requires a bearerToken for Auth. The following thread post shows how to create one:
     https://community.lifx.com/t/creating-a-lifx-http-api-token/25
   Save this as LIFX_TOKEN in the enviroment variables on Netlify (https://www.netlify.com/docs/continuous-deployment/#build-environment-variables)

📚 The bulb id that you send the request to can be found with the following API call described in LIFX's docs:
     https://api.developer.lifx.com/docs/list-lights
   Save this as LIFX_BULB_ID in the environment variables on Netlify.`.bold
  );
}
