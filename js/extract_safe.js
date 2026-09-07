const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, '..', 'index.html');
const mainJsFile = path.join(__dirname, 'main.js');

let html = fs.readFileSync(indexFile, 'utf8');

// Find the last <script> block which contains our app logic
const scriptStartStr = '<script>';
let lastScriptIndex = html.lastIndexOf(scriptStartStr);
const scriptEndStr = '</script>';
let lastScriptEndIndex = html.lastIndexOf(scriptEndStr);

if (lastScriptIndex !== -1 && lastScriptEndIndex !== -1 && lastScriptIndex < lastScriptEndIndex) {
    const scriptContent = html.substring(lastScriptIndex + scriptStartStr.length, lastScriptEndIndex).trim();
    
    // Only extract if it's substantial (e.g. > 1000 chars) to ensure it's the main app script
    if (scriptContent.length > 1000) {
        fs.writeFileSync(mainJsFile, scriptContent, 'utf8');
        
        html = html.substring(0, lastScriptIndex) + 
               '<script src="js/api.js"></script>\n    ' + 
               '<script src="js/product.js"></script>\n    ' +
               '<script src="js/ui.js"></script>\n    ' +
               '<script src="js/chat.js"></script>\n    ' +
               '<script src="js/main.js"></script>\n' +
               html.substring(lastScriptEndIndex + scriptEndStr.length);
               
        fs.writeFileSync(indexFile, html, 'utf8');
        console.log('Script extracted safely! Extracted length:', scriptContent.length);
    } else {
        console.log('Found a script tag, but it was too small to be the main app logic.');
    }
} else {
    console.log('Script block not found!');
}
