//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();


    document.getElementById("sub")?.addEventListener('click', () => {
        updateArgsAndCompile();
    });


    function updateArgsAndCompile() {
        const ul = document.getElementById("args");
        let argString = "";
        for (let i = 0; i < ul?.children.length; i++) {
            let li = ul?.children[i];
            let checked = li?.childNodes[0].checked;
            if (checked) {
                argString += li?.childNodes[1].textContent;
                argString += " ";
            }
        }
        vscode.postMessage({ type: 'compile', value: argString });
    }

}());


