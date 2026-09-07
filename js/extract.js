const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, '..', 'index.html');
const mainJsFile = path.join(__dirname, '..', 'js', 'main.js');

let html = fs.readFileSync(indexFile, 'utf8');

const scriptStart = html.indexOf('<script>');
const scriptEndMatch = html.lastIndexOf('</script>');

if (scriptStart !== -1 && scriptEndMatch !== -1) {
    const scriptContent = html.substring(scriptStart + 8, scriptEndMatch).trim();
    fs.writeFileSync(mainJsFile, scriptContent, 'utf8');
    
    html = html.substring(0, scriptStart) + 
           '<script src="js/main.js"></script>\n' + 
           '<script src="js/product.js"></script>\n' +
           html.substring(scriptEndMatch + 9);
           
    fs.writeFileSync(indexFile, html, 'utf8');
    console.log('Script extracted successfully!');
} else {
    console.log('Script block not found!');
}
