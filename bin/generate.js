#!/usr/bin/env node
const exec = require("child_process").exec

args = process.argv.slice(2);
endParamIndex = args.findIndex(elem => !elem.startsWith("-"));
params = endParamIndex == -1 ? args : args.slice(0, endParamIndex);
notparams = endParamIndex == -1 ? [] : args.slice(endParamIndex);

function existsParam(x) {
  return typeof params.find(elem => elem == x) !== "undefined";
}
function existsPrefixParam(x) {
  return typeof params.find(elem => elem.startsWith(x)) !== "undefined";
}
function getParam(x, defaultValue) {
  var param = params.find(elem => elem.startsWith(x));
  if(typeof param !== "undefined") {
    var returnValue = param.substring(x.length + 1);
    if(returnValue == "") return defaultValue;
    return returnValue;
  } else {
    return defaultValue;
  }
}
function getTask(x, defaultValue) {
  var param = params.find(elem => elem.startsWith(x));
  if(typeof param !== "undefined") {
    return param.substring(x.length + 1);
  } else {
    return defaultValue;
  }
}

if(existsParam("--help") || existsParam("-h")) {
  console.log(`Syntax:
hyde [--backward] [--watch [--forward]] [--autosync] [--serve[=dir] [--autosave=true/false] [--question=true/false] [--edit=true/false]] task

Executes the task command (arbitrary Elm program) after interpreting the file "hydefile" or "hydefile.elm" in scope.

  -b, --backward  : Once, back-propagates changes from the outputs to the inputs.
  -w, --watch     : Continually, watches for changes in the inputs and outputs.
                If --backward is set, then it will immediately start to back-propagate changes.
                Else it regenerates the websites and listens to changes.
                If -f, --forward is set, the generation will not happen backward.
  -a, --autosync  : If an ambiguity is found, choose the most likely solution.
  --serve[=dir]   : If set, launches the reversible Editor http server at the given directory.
                    if the directory is the parent directory, --serve='../'
                    Furthermore, activates the --watch option
                    If set, the following Editor options can be set:
                    --autosave (default true)
                    --edit (default true)
                    --question (default true)

Exploring the build:

  hyde resolve _                  : List the available tasks
  hyde resolve module._           : List the available tasks inside module
  hyde resolve module.submodule._ : List the available tasks inside module's submodule`);
  return;
}
var watch      = existsParam("--watch")    || existsParam("-w");
var autosync   = existsParam("--autosync") || existsParam("-a");
const forward  = existsParam("--forward")  || existsParam("-f");
const backward = existsParam("--backward") || existsParam("-b");
const serveDir = getParam("--serve", ".");
if(serveDir && existsPrefixParam("--serve")) {
  var options = {path:serveDir};
  options["autosave"] = getParam("--autosave", "true") == "true";
  options["edit"] = getParam("--edit", "true") == "true";
  options["question"] = getParam("--question", "true") == "true";
  options["openbrowser"] = true;
  require("http-server-editor")(options);
}
if(existsPrefixParam("--serve")) {
  watch = true;
}
if(notparams.length == 0) {
  var task = "all";
}
else {
  var task = notparams.join(" ");
}

const readline = require('readline');
const fs = require("fs")
const sns = require("sketch-n-sketch");

var bootstrappedSource = `
-- Input: listTasks         True/False if the list of tasks should be displayed
-- Input: sublevel          Under which submodule should we list tasks
-- Input: task              The task to execute
-- Input: recordFileRead    A callback on every read file's name
-- Input: recordFolderList  A callback on every read folder's name
-- Output: List (Write filename filecontent | Err errormessage)

(fs) = nodejs.delayedFS { nodejs.nodeFS |
        read name =
          let _ = recordFileRead name in
          nodejs.nodeFS.read name,
        listdir name =
          let _ = recordFolderList name in
          nodejs.nodeFS.listdir name
        } fileOperations
initEnv = __CurrentEnv__

fs.read("hydefile.leo")
|> Maybe.orElse (fs.read "hydefile")
|> Maybe.orElse (fs.read "hydefile.elm")
|> case of
  Just source ->
    if listTasks then
      Update.freeze "{\\n" + source + Update.freeze "\\n}" + sublevel
      |> __evaluate__ (("willwrite", False)::initEnv)
      |> Result.withDefaultMapError error
    else
    source + Update.freeze "\\n\\nlet t = " + task + "\\n    t = if typeof t == 'function' then t () else t\\n    t = if typeof t == 'list' then t else [t]\\n in t"
    |> __evaluate__ (("willwrite", willwrite)::initEnv)
    |> Result.withDefaultMapError error
    |> case of
      {} as x -> [x] -- In case there is just one file write.
      x -> x
  Nothing -> error "No 'hydefile' or 'hydefile.elm' found. Please create one."`

pushResultOn = array => name => { array.push(name); return 0 }

if(notparams.length >= 1 && notparams[0] == "resolve") {
  var sublevel = "";
  var parentPrefix = "";
  var filter = () => true;
  var filterStr = "";
  if(notparams.length >= 2) {
    var target = notparams[1];
    if(target.endsWith("._")) {
      var common = target.substring(0, target.length - 2)
      parentPrefix = common + ".";
      sublevel = "." + common;
      filterStr = " inside " + common;
    } else if(target.endsWith("_") && target.indexOf(".") >= 0) {
      sublevel = "." + target.replace(/\.[^\.]*$/g, "");
      var prefix = target.substring(0, target.length - 1);
      parentPrefix = target.replace(/^(.*\.)[^\.]*$/g, (match, p1) => p1);
      filter = (elem) => elem.startsWith(prefix);
      filterStr = " starting with " + prefix;
    } else if(target.endsWith("_")) {
      var prefix = target.substring(0, target.length - 1);
      console.log("prefix", prefix)
      filter = (elem) => elem.startsWith(prefix);
      filterStr = " starting with " + prefix;
    }
  }
  var valResult = sns.objEnv.string.evaluate({willwrite:false, fileOperations:[], listTasks: true, sublevel: sublevel,
    recordFileRead: name => 0,
    recordFolderList: name => 0,
    })(bootstrappedSource);
  var result = sns.process(valResult)(sns.valToNative);
  if(result.ctor == "Ok") {
    var tasks = Object.keys(result._0);
    console.log("List of available tasks" + filterStr + ":")
    for(var i = 0; i < tasks.length; i++) {
      var givenTask = parentPrefix + tasks[i]
      if(filter(givenTask)) {
        console.log("  hyde " + givenTask + (givenTask == "all" ? "  (equivalent to 'hyde' only)" : ""));
      }
    }
    return;
  } else {
    console.log("error while evaluating", result._0)
    return;
  }
  return;
}

if(notparams.length >= 1 && notparams[0] == "inspect") {
  task = notparams.slice(1).join(" ");
  if(task == "") task = "all";
  var filesToWatch = [];
  var foldersToWatch = [];
  var [filesToWrite, filesToWriteVal, filesToWatch, foldersToWatch] = computeForward(false);
  filesToWatch = filesToWatch.filter(name => name != "hydefile.elm" && name != "hydefile");
  if(filesToWatch.length > 0)  console.log("Input files:");
  else console.log("No input files");
  for(var i in filesToWatch) {
    console.log("  " + filesToWatch[i]);
  }
  if(foldersToWatch.length > 0) console.log("Input folders:");
  for(var i in foldersToWatch) {
    console.log("  " + foldersToWatch[i]);
  }
  if(filesToWrite.length > 0) console.log("Output files:");
  else console.log("No output files");
  for(var i in filesToWrite) {
    var fw = filesToWrite[i];
    if(fw["$d_ctor"] == "Write") {
      var {_1: name, _2: content} = fw.args;
      console.log("  " + name);
    }
    if(fw["$d_ctor"] == "Error") {
      var {_1: msg} = fw.args;
      console.log("Error: " + msg);
    }
  }
  return;
}

// Returns the set of files to be written and its representation as a Val
function computeForward(willwrite) {
  if(typeof willwrite == "undefined") willwrite = true;
  var filesToWatch = [];
  var foldersToWatch = [];
  var valResult = sns.objEnv.string.evaluate({willwrite:willwrite, fileOperations:[], listTasks: false, task: task,
    recordFileRead: pushResultOn(filesToWatch),
    recordFolderList: pushResultOn(foldersToWatch) })(bootstrappedSource);
  var result = sns.process(valResult)(sns.valToNative);

  if(result.ctor == "Ok") {
    var filesToWrite = result._0;
    return [filesToWrite, valResult._0, filesToWatch, foldersToWatch];
  } else {
    console.log("[hyde] error while evaluating", result._0)
    return [false, false, [], []];
  }
}

function writeFiles(filesToWrite) {
  var written = 0;
  var errors = 0;
  for(var i = 0; i < filesToWrite.length; i++) {
    var fw = filesToWrite[i];
    if(fw["$d_ctor"] == "Write") {
      written++;
      var {_1: name, _2: content} = fw.args;
      fs.writeFileSync(name, content, "utf8");
    } else if(fw["$d_ctor"] == "Error") {
      errors++;
      console.log("[hyde]" + fw.args._1);
    } else {
      console.log("[hyde] Unrecognized command. Only 'Write name content' and 'Error msg' are suppported at this moment. ", fw);
    }
  }
  if(written) {
    console.log("[hyde] Written " + filesToWrite.length + " file" + (filesToWrite.length > 1 ? "s" : ""));
  }
  if(errors) {
    console.log("[hyde] " + errors + " errors found.");
  }
}

function computeAndWrite(willwrite) {
  var [filesToWrite, valFilesToWrite, filesToWatch] = computeForward();
  if(filesToWrite) writeFiles(filesToWrite);
  return [filesToWrite, valFilesToWrite, filesToWatch];
}

if(!watch && !backward) {
  computeAndWrite();
  return;
}

function stringDiffSummary(oldString, newString, stringDiffs) {
  if(stringDiffs["$d_ctor"] == "Nothing") return "";
  var listStringDiffs = stringDiffs.args._1.args._1; // It's a VStringDiffs
  var offset = 0;
  var summary = "";
  for(var i = 0; i < listStringDiffs.length; i++) {
    var {args: {_1: start, _2: end, _3: replaced}} = listStringDiffs[i];
    var removed = oldString.substring(start, end);
    var inserted = newString.substring(start + offset, start + offset + replaced);
    var beforeRemoved = oldString.substring(0, start);
    var linesBeforeRemoved = beforeRemoved.split(/\r\n|\r|\n/);
    var lineNumber = linesBeforeRemoved.length;
    var charNumber = linesBeforeRemoved[linesBeforeRemoved.length - 1].length + 1;
    summary += " L" + lineNumber + "C" + charNumber + ", "
    if(removed == "")
      summary += "inserted '" + inserted + "'";
    else if(inserted == "")
      summary += "removed '" + removed + "'";
    else
      summary += "removed '" + removed + "', inserted '"+ inserted +"'";
    offset += replaced - (end - start);
  }
  return summary;
}

function fileOperationSummary(operations) {
  if(operations == null) return "";
  var summary = "";
  for(var i = 0; i < operations.length; i++) {
    var {_1: path, _2: action} = operations[i];
    if(summary != "") summary += "\n";
    if(action["$d_ctor"] == "Write") {
      summary += "Modify " + path + ", " + stringDiffSummary(action.args._1, action.args._2, action.args._3);
    } else if(action["$d_ctor"] == "Create") {
      summary += "Created " + path;
    } else if(action["$d_ctor"] == "Rename") {
      summary += "Renamed " + path + " to " + action.args._1;
    } else if(action["$d_ctor"] == "Delete") {
      summary += "Deleted " + path;
    } else {
      console.log("unrecognized action:", action);
    }
  }
  return summary;
}

// Apply the given operations to the file system. TODO: Merge different writes to a single file.
function applyOperations(operations) {
  for(var i = 0; i < operations.length; i++) {
    var {_1: path, _2: action} = operations[i];
    if(action["$d_ctor"] == "Write") {
      fs.writeFileSync(path, action.args._2, "utf8");
    } else if(action["$d_ctor"] == "Create") {
      // TODO: Create the path if necessary
      fs.writeFileSync(path, action.args._1, "utf8");
    } else if(action["$d_ctor"] == "Rename") {
      fs.renameSync(path, action.args._1);
    } else if(action["$d_ctor"] == "Delete") {
      fs.unlinkSync(path);
    } else {
      console.log("unrecognized action:", action);
    }
  }
  // Now compute the pipeline forward
  return computeAndWrite();
}

// Given the output of the pipeline, reads the disk and computes [the new output, if the output has changed]
function getNewOutput(filesToWrite) {
  var newFilesToWrite = [];
  var hasChanged = false;
  for(var i = 0; i < filesToWrite.length; i++) {
    var action = filesToWrite[i];
    if(action["$d_ctor"] == "Write") {
      var {_1: name, _2: content} = action.args;  
      var newContent = fs.readFileSync(name, "utf8");
      if(newContent != content) hasChanged = true;
      newFilesToWrite.push({'$d_ctor': 'Write', args: {_1: name, _2: newContent}});
    } else {
      newFilesToWrite.push(action);
    }
  }
  return [newFilesToWrite, hasChanged];
}

function doUpdate(filesToWrite, valFilesToWrite, inputFilesToWatch, inputFoldersToWatch, callback) {
  if(typeof callback == "undefined") {
    console.log("doUpdate should have a callback");
    return;
  }
  if(!filesToWrite) {
    console.log("Recomputing the pipeline");
  }
  [filesToWrite, filesToWriteVal, inputFilesToWatch, inputFoldersToWatch] =
    filesToWrite ? [filesToWrite, valFilesToWrite, inputFilesToWatch, inputFoldersToWatch] : computeForward();
  if(!filesToWrite) return callback(false, false, [], []);
  var [newFilesToWrite, hasChanged] = getNewOutput(filesToWrite);
  if(!hasChanged) {
    console.log("[hyde] No modifications found.");
    if(!watch) {
      console.log("[hyde] Done.")
    }
    return callback(filesToWrite, filesToWriteVal, inputFilesToWatch, inputFoldersToWatch);
  }
  console.log("[hyde] Computing output value...")
  var newFilesToWriteVal = sns.nativeToVal(newFilesToWrite);
  console.log("[hyde] Updating pipeline...")
  var resSolutions = sns.objEnv.string.updateWithOld({willwrite:false,       fileOperations: [], listTasks: false, task: task,
    recordFileRead: name => 0,
    recordFolderList: name => 0})(bootstrappedSource)(filesToWriteVal)(newFilesToWriteVal);
  if(resSolutions.ctor == "Err") {
    console.log("[hyde] Error while updating: " + resSolutions._0);
    return callback(filesToWrite, filesToWriteVal, inputFilesToWatch, inputFoldersToWatch);
  }
  var solutions = resSolutions._0;
  if(!sns.lazyList.nonEmpty(solutions)) {
    console.log("[hyde] Error while updating, solution array is empty");
    return callback(filesToWrite, filesToWriteVal, inputFilesToWatch, inputFoldersToWatch);
  }
  var {_0: newEnv, _1: updatedBootstrappedSource} = sns.lazyList.head(solutions);
  var headOperations = newEnv.fileOperations;
  if(bootstrappedSource != updatedBootstrappedSource) {
    console.log("[hyde] Warning: Cannot update the bootstrapped source of Hyde. Got ", updatedBootstrappedSource);
  }  
  // maybeAddGeneratorDiff(headOperations, bootstrappedSource, updatedBootstrappedSource);
  // Check for ambiguity.
  console.log("[hyde] Checking for ambiguity");
  var tailSolutions = autosync ? {ctor: "Nil"} : sns.lazyList.tail(solutions);
  if(autosync || sns.lazyList.isEmpty(tailSolutions)) {
    console.log("[hyde] " + (autosync ? "--autosync not checking for ambiguities" : "No ambiguity found ") + "-- Applying the transformations");
    [a, b] = applyOperations(headOperations);
    return callback(a, b, inputFilesToWatch, inputFoldersToWatch);
  } else {
    var solutions = [headOperations];
    console.log("[hyde] Ambiguity found -- Computing the second solution");
    var solutionsRemaining = tailSolutions;
    var oneMoreSolution = () => {
      var {_0: alternativeEnv, _1: alternativeBootstrappedSource} = sns.lazyList.head(solutionsRemaining);
      var alternativeOperations = alternativeEnv.fileOperations;
      if(bootstrappedSource != alternativeBootstrappedSource) {
        console.log("[hyde] Warning: Cannot update the bootstrapped source of Hyde. Got ", alternativeBootstrappedSource);
      } 
      //maybeAddGeneratorDiff(alternativeOperations, source, alternativeSolution);
      solutions.push(alternativeOperations);
    }
    oneMoreSolution();
    
    console.log("[hyde] Ambiguity detected");
    
    function askSolutions() {
      function showQuestion() {
        for(var i = 0; i < solutions.length; i++) {
          console.log(`[hyde] Solution #${i+1}:`, fileOperationSummary(solutions[i]));
        }
        
        console.log(`[hyde] Which solution number should I apply? Other possibilities:${solutionsRemaining !== false ? "\n  Find [m]ore solutions?": ''}${!autosync ? "\n  Enable [a]utosync?" : ''}
  [w]ait for other changes?
  [r]evert changes made to outputs?`);
      }
      showQuestion();

      var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
      });
      rl.on('line', function(line){
        if((line.toLowerCase() == "autosync" || line.toLowerCase() == "a" || line.toLowerCase() == "auto") && !autosync) {
          autosync = true;
          console.log("[hyde] Autosync activated. Next time, use the --autosync option to prevent questionning.");
          console.log("[hyde] Choosing the first solution for this question.");
          line = "1";
        }
        if((line.toLowerCase() == "more" || line.toLowerCase() == "m") && solutionsRemaining !== false) {
          solutionsRemaining = sns.lazyList.tail(solutionsRemaining);
          if(sns.lazyList.isEmpty(solutionsRemaining)) {
            console.log("[hyde] No other solution found")
            solutionsRemaining = false;
          } else {
            console.log("[hyde] one more solution found");
            oneMoreSolution();
          }
          showQuestion();
        } else if(line.toLowerCase() == "revert" || line.toLowerCase() == "r") {
          console.log("[hyde] Overwriting output files with their original value...");
          [a, b] = computeAndWrite(true);
          rl.close();
          callback(a, b, inputFilesToWatch, inputFoldersToWatch);
        } else if(line.toLowerCase() == "wait" || line.toLowerCase() == "w") {
          console.log("[hyde] Waiting for other changes...");
          rl.close();
          callback(filesToWrite, valFilesToWrite, inputFilesToWatch, inputFoldersToWatch);
        } else {
          var selectedSolution = solutions[parseInt(line) - 1];
          if(selectedSolution != null) {
            rl.close();
            [a, b] = applyOperations(selectedSolution);
            callback(a, b, inputFilesToWatch, inputFoldersToWatch);
          } else {
            console.log("[hyde] Input not recognized:" + line);
            showQuestion();
          }
        }
      })
    }
    askSolutions();
    return [];
  }
}

if(!watch && backward) { // !watch would have been sufficient because here, watch || backward
  doUpdate(false, false, [], [], () => {});
  return;
}

// A timer use to trigger update only after a certain amount of time.
var changeTimer = false;
var watchers = [];

function unwatchEverything() {
  console.log("[hyde] Paused watching changes to files");
  for(var i = 0; i < watchers.length; i++) {
    watchers[i].close();
  }
  watchers = [];
}

function doWatch(filesToWrite, valFilesToWrite, filesToWatch, foldersToWatch) {
  if(!filesToWrite) return;
  var outputFileWatcherCallback = 
    ((filesToWrite, valFilesToWrite, filesToWatch, foldersToWatch) => (eventType, filename) => {
        if(eventType == "change") {
          if(changeTimer) {
            clearTimeout(changeTimer);
          }
          changeTimer =
            setTimeout(((filesToWrite, valFilesToWrite, filesToWatch, foldersToWatch) => () => {
              changeTimer = false;
              unwatchEverything();
              doUpdate(filesToWrite, valFilesToWrite, filesToWatch, foldersToWatch, doWatch);
            })(filesToWrite, valFilesToWrite, filesToWatch, foldersToWatch), 500); // Time for all changes to be recorded
        }
    })(filesToWrite, valFilesToWrite, filesToWatch, foldersToWatch)
  
  if(!forward) {
    for(var i in filesToWrite) {
      var action = filesToWrite[i];
      if(action["$d_ctor"] == "Write") {
        var {_1: name, _2: content} = action.args;  
        var watcher = fs.watch(name, outputFileWatcherCallback);
        watchers.push(watcher);
      }
    }
  }
  var inputFileWatcherCallback = (eventType, generateElmScript) => {
    if(changeTimer) {
      clearTimeout(changeTimer);
    }
    changeTimer =
      setTimeout(() => {
        changeTimer = false;
        unwatchEverything();
        var [filesToWrite, valFilesToWrite, filesToWatch, foldersToWatch] = computeAndWrite();
        doWatch(filesToWrite, valFilesToWrite, filesToWatch, foldersToWatch);
      }, 500); // Time for all changes to be recorded
  }
  
  for(var i in filesToWatch) {
    var name = filesToWatch[i];
    if(fs.existsSync(name)) {
      var watcher = fs.watch(name, inputFileWatcherCallback);
      watchers.push(watcher);
    }
  }
  for(var i in foldersToWatch) {
    var name = foldersToWatch[i];
    if(fs.existsSync(name)) {
      var watcher = fs.watch(name, inputFileWatcherCallback);
      watchers.push(watcher);
    }
  }
  if(!forward) {
    console.log("[hyde] Watching for changes on inputs or outputs...")
  } else {
    console.log("[hyde] Watching for inputs to change...")
  }
}


if(watch) {
  var filesToWrite;
  var valFilesToWrite;
  var inputFilesToWatch;
  var inputFoldersToWatch;
  var continuation = (filesToWrite, valFilesToWrite, inputFilesToWatch, inputFoldersToWatch) => {
    var [filesToWrite, valFilesToWrite, inputFilesToWatch, inputFoldersToWatch] =
      filesToWrite ? [filesToWrite, valFilesToWrite, inputFilesToWatch, inputFoldersToWatch] : computeForward();
    if((!backward) && filesToWrite) { // Do the initial file write to make sure everything is consistent.
      writeFiles(filesToWrite);
    }
    doWatch(filesToWrite, valFilesToWrite, inputFilesToWatch, inputFoldersToWatch);
  }
  if(backward) {
    doUpdate(false, false, [], [], continuation);
  } else {
    continuation(false, false, [], []);
  }
  
  
}
