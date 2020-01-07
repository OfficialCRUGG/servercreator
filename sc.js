#!/usr/bin/env node
const fs = require('fs');
const inquirer = require("inquirer");
const { get } = require("axios");
const download = require("download");
const logg = require("logg.js");

main();

async function main() {
    inquirer
    .prompt([
        // Game
        {
            type: "list",
            name: "game",
            message: "What Game do you want to install a Server for?",
            choices: ["Minecraft"],
            filter: function(value) {
                if(value == "Minecraft") {
                    return "mc";
                }
            }
        },

        // Minecraft
        {
            type: "list",
            name: "mc_software",
            message: "What Server Software do you want to install?",
            choices: ["Paper (Java Server)"],
            filter: function(value) {
                if(value == "Paper (Java Server)") {
                    return "paper";
                }
            },
            when: function(answers) {
                return answers.game == "mc";
            }
        },
        {
            type: "list",
            name: "mc_paper_version",
            message: "What Server Version do you want to install?",
            choices: await getMcVersions("Paper"),
            when: function(answers) {
                return answers.game == "mc" && answers.mc_software == "paper";
            }
        },
        {
            type: "list",
            name: "mc_startscript",
            message: "Include Start Script? For which operating systems?",
            choices: ["None", "Windows", "Linux/Mac", "Both"],
            when: function(answers) {
                return answers.game == "mc";
            },
            filter: function(value) {
                if(value == "None") {
                    return "none";
                } else if(value == "Windows") {
                    return "win";
                } else if(value == "Linux/Mac") {
                    return "unix";
                } else if(value == "Both") {
                    return "all";
                }
            },
        },
        {
            type: "list",
            name: "mc_screen",
            message: "Use Screen for LINUX/MAC Startscript?",
            choices: ["Yes", "No"],
            when: function(answers) {
                return answers.game == "mc" && (answers.mc_startscript == "unix" || answers.mc_startscript == "all");
            },
            filter: function(value) {
                if(value == "Yes") {
                    return true;
                } else {
                    return false;
                }
            },
        },
        {
            type: "input",
            name: "mc_screen_name",
            message: "What should the Screen Process Name be?",
            validate: function(value) {
                var valid = value.length > 4;
                return valid || "The process name has to be 5 or more characters.";
            },
            when: function(answers) {
                return answers.mc_screen === true && (answers.mc_startscript === "unix" || answers.mc_startscript === "all");
            }
        }
    ])
    .then(async (answers) => {
        // Minecraft
        if(answers.game == "mc") {
            let eulaSoftware = ["paper"];

            // Get Jar Info
            let jar = (await get("https://mcmirror.io/api/file/" + answers.mc_software + "/" + (await getMcVersion(answers.mc_software, answers["mc_" + answers.mc_software + "_version"])))).data.direct_link;
            
            // Download Jar
            let jarArray = jar.split("/");
            let jarFile = jarArray[jarArray.length - 1];
            logg.info("Downloading Server " + jarFile + " from " + jar + "...");
            download(jar, process.cwd()).then(() => {
                logg.info("Successfully downloaded Server " + jarFile + ".");
                
                // eula.txt
                if(eulaSoftware.includes(answers.mc_software)) {
                    logg.info("Creating File 'eula.txt'...");
                    let eulaStream = fs.createWriteStream("eula.txt");
                    eulaStream.write("# By using ServerCreator you accepted the EULA during the wizard so the below value was set automatically.\n");
                    eulaStream.write("# Minecraft EULA: https://account.mojang.com/documents/minecraft_eula\n");
                    eulaStream.write("eula=true");
                    eulaStream.close();
                    logg.info("Successfully created File 'eula.txt'...");
                }
                if(answers.mc_startscript == "win" || answers.mc_startscript == "all") {
                    logg.info("Creating File 'start.bat'...");
                    let winStream = fs.createWriteStream("start.bat");
                    winStream.write("@echo off\n");
                    winStream.write("title ServerCreator Minecraft Server\n");
                    winStream.write("echo Starting ServerCreator Minecraft Server...\n");
                    winStream.write("java -Xmx1G -jar " + jarFile + "\n");
                    winStream.write("echo Server exited. Press any key to close this window.\n");
                    winStream.write("pause >nul");
                    winStream.close();
                    logg.info("Successfully created File 'start.bat'...");
                }
                if(answers.mc_startscript == "unix" || answers.mc_startscript == "all") {
                    logg.info("Creating File 'start.sh'...");
                    if(answers.mc_screen) {
                        let unixStream = fs.createWriteStream("start.sh");
                        unixStream.write("echo Starting ServerCreator Minecraft Server...\n");
                        unixStream.write("screen -AmS " + answers.mc_screen_name + " java -Xmx1G -jar " + jarFile);
                        unixStream.close();
                    } else {
                        let unixStream = fs.createWriteStream("start.sh");
                        unixStream.write("echo Starting ServerCreator Minecraft Server...\n");
                        unixStream.write("java -Xmx1G -jar " + jarFile);
                        unixStream.close();
                    }
                    logg.info("Successfully created File 'start.sh'...");
                }
            });
        }
    });
}

async function getMcVersions(software) {
    return new Promise(async (resolve, reject) => {
        let versionsRaw = (await get("https://mcmirror.io/api/list/" + software)).data;
        let versions = [];
        versionsRaw.forEach((version, index) => {
            if((index + 1) < versionsRaw.length) {
                versions.push(version.split("-")[1]);
            } else {
                resolve(versions.reduce(function(a,b){if(a.indexOf(b)<0)a.push(b);return a;},[]));
            }
        });
    })
}

async function getMcVersion(software, versionNumber) {
    return new Promise(async (resolve, reject) => {
        let versions = (await get("https://mcmirror.io/api/list/" + software)).data;
        versions.forEach((version, index) => {
            if(versionNumber == version.split("-")[1]) {
                resolve(version);
            }
            if((index + 1) == versions.length) {
                resolve(false);
            }
        }); 
    })
}