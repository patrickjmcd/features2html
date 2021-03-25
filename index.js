const fs = require("fs");
const handlebars = require("handlebars");
const moment = require("moment");
const glob = require("glob");
const { resolve } = require("path");

// DEFAULT SETTINGS
var BREAKBEFOREWORD = null;

const writeOutput = (html, outputfile) => {
    fs.writeFileSync(outputfile, html, "utf-8");
    console.log("DONE! HTML was written to %s", outputfile);
};

const parseFeatureFile = async (featureFilename) => {
    var feature = new Object();
    feature.background = "";
    feature.scenarios = [];
    var scenario = new Object();
    scenario.content = "";

    var foundMultirowScenario = false;
    var featureLineWasFound = false;
    var scenariosStarted = false;

    const fileContents = await fs.promises.readFile(featureFilename);
    const fileArray = fileContents.toString().split("\n");

    for (let i = 0; i < fileArray.length; i++) {
        const line = fileArray[i];
        if (
            lineIndicatesThatANewScenarioBegins(line) &&
            foundMultirowScenario
        ) {
            // new scenario found. start parsing new scenario
            feature.scenarios.push(scenario);
            scenario = new Object();
            scenario.content = "";
            foundMultirowScenario = false;
            scenariosStarted = true;
        }

        if (
            lineIndicatesThatANewScenarioBegins(line) ||
            foundMultirowScenario
        ) {
            // We are parsing a scenario. It may be a new scenario or a row within a scenario
            foundMultirowScenario = true;
            scenariosStarted = true;

            // Handle sidenote
            if (line.includes("Sidenote: ")) {
                scenario.sidenote = line.replace("Sidenote: ", "");
            } else {
                // Handle scenario content
                if (scenario.content) {
                    scenario.content = scenario.content + "\n" + line;
                } else {
                    scenario.content = line;
                }
            }
        }

        if (
            !line.includes("Feature") &&
            !scenariosStarted &&
            featureLineWasFound
        ) {
            // Everything between feature and first scenario goes into feature.background, except background keyword
            var fixedline = BREAKBEFOREWORD
                ? line.replace(
                      BREAKBEFOREWORD,
                      '</p><p class="p-after-p">' + BREAKBEFOREWORD
                  )
                : line;
            const foundComment = fixedline.match(/^\s*#/);

            const formattedLine = foundComment
                ? `<em>${fixedline}</em><br />\n`
                : `${fixedline}<br />\n`;

            feature.background += formattedLine.replace(
                "Background:",
                "<strong>Background:</strong>"
            );
        }

        if (line.includes("Feature: ")) {
            feature.name = line.replace("Feature: ", "");
            featureLineWasFound = true;
        }
    }
    if (scenario && scenario.content) {
        feature.scenarios.push(scenario);
    }
    return feature;
};

const lineIndicatesThatANewScenarioBegins = (line) => {
    return (
        line.includes("Scenario: ") ||
        line.includes("Scenario Outline: ") ||
        line.includes("Sidenote: ") ||
        line.includes("Background: ")
    );
};

const getAllFeatureFiles = async (dirName, recursive) => {
    const globPart = recursive ? "**/*.feature" : "*.feature";
    const directory =
        dirName.slice(-1) === "/" ? dirName.slice(0, -1) : dirName;
    // if the user specifies a .feature file, use the exact path
    const globSearch =
        dirName.split(".").pop() === "feature"
            ? dirName
            : `${directory}/${globPart}`;
    return new Promise((resolve, reject) => {
        glob.glob(globSearch, function (err, files) {
            if (err) {
                reject(err);
            }
            console.log(files);
            resolve(files);
        });
    });
};

module.exports.convert = async ({
    inputDir,
    templatesDir,
    outputFile,
    author,
    productName,
    recursive,
}) => {
    const docTemplate = templatesDir + "/doc_template.html";
    const featureTemplate = templatesDir + "/feature_template.html";
    const featureFiles = await getAllFeatureFiles(inputDir, recursive);
    var docHandlebarTemplate = handlebars.compile(
        await fs.promises.readFile(docTemplate, "utf-8")
    );
    var featureHandlebarTemplate = handlebars.compile(
        await fs.promises.readFile(featureTemplate, "utf-8")
    );
    var cssStyles = await fs.promises.readFile(
        templatesDir + "/style.css",
        "utf-8"
    );

    const features = await Promise.all(
        featureFiles.map(async (f) => {
            return await parseFeatureFile(f);
        })
    );

    var featuresHtml = "";
    if (features) {
        for (var i = 0; i < features.length; i++) {
            featuresHtml += featureHandlebarTemplate(features[i]);
        }
    }
    var docData = new Object();
    docData.cssStyles = cssStyles;
    docData.creationdate = moment().format("LL");
    docData.author = author;
    docData.productname = productName;
    docData.featuresHtml = featuresHtml;
    docData.listOfFeatures = features
        .map((f) => `<li class="feature-name">${f.name}</li>`)
        .join("\n");
    var docHtml = docHandlebarTemplate(docData);

    if (outputFile) {
        writeOutput(docHtml, outputFile);
    } else {
        // write to default output dir. Create first if necessary
        fs.mkdir("output_features2html", function (e) {
            if (!e || (e && e.code === "EEXIST")) {
                var outputFilepath =
                    "output_features2html/features_" +
                    moment().format("YYYYMMDD_HHmm") +
                    ".html";
                writeOutput(docHtml, outputFilepath);
            } else {
                console.log(e);
            }
        });
    }
};
