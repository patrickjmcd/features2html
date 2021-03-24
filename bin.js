#!/usr/bin/env node
const commander = require("commander");
const { convert } = require("./index");
// commands
commander.version("0.1");
commander
    // .command("create")
    .description("Create html from feature files")
    .option(
        "-i, --input-dir <inputDir>",
        "read feature files from path",
        "examples/features"
    )
    .option(
        "-t, --templates-dir <templatesDir>",
        "read the files doc_template.html, feature_template.html and style.css from path",
        "default/templates"
    )
    .option("-o, --output-file <outputFile>", "send output to file path")
    .option(
        "-p, --product-name <productName>",
        "The name of your product used in headline and header",
        "My Product Name"
    )
    .option(
        "-a, --author <author>",
        "The author name used in header",
        "John Doe"
    )
    .option(
        "-b, --break-before-word <breakBeforeWord>",
        "create a line break before every occurrance of this word in the background"
    )
    .action(async (options) => {
        convert(options);
    });

// parse commands
commander.parse(process.argv);
