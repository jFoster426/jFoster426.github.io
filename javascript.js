// Set up the mutation observer because the DOM needs to be updated before code can
// be added and then again before the code highlighting can run properly
let targetNode = null;
// Options for the observer (which mutations to observe)
const config = { childList: true, subtree: true };
// Create an observer instance that will eventually be linked to the callback function
let observer = null;

// Runs the first time the DOM loads the content
document.addEventListener('DOMContentLoaded', (event) => {
    targetNode = document.getElementById('body');
    loadContent();
});

function resizeText() {
    const pageWidth = window.innerWidth;
    const websiteHeaderText = document.getElementById('website-header-text');
    const newFontSize = Math.min(Math.max(pageWidth / 15, 50), 100);
    websiteHeaderText.style.fontSize = newFontSize + 'px';
}

function resizeTable() {
    const pageWidth = window.innerWidth;
    const mainTable = document.getElementById('main-table');
    const mainTableWidth = Math.max(pageWidth * 0.70, 650);
    mainTable.style.width = mainTableWidth + 'px';
}

function loadContent() {
    // Insert div contents
    const contentElements = document.getElementsByTagName("div");

    for (let i = 0; i < contentElements.length; i++) {
        // Added this code to replace the ID with parameters from the URL that match the classname
        const contentElementClassName = contentElements[i].className;

        let url = window.location.href;
        let urlObj = new URL(url);
        let params = new URLSearchParams(urlObj.search);
        let textcontent = params.get(contentElementClassName);

        if (textcontent != null) {
            contentElements[i].id = textcontent;
        }
        // end added code

        const contentElementName = contentElements[i].id;

        // Ignore all divs with empty in id
        if (contentElementName.includes("empty")) continue;

        fetch(contentElementName).then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            contentElements[i].innerHTML = data; // Inserts the text into the code block
        })
        .catch(error => {
            contentElements[i].textContent = `Error loading file: ${error}`;
        });
    }

    // Create an observer instance linked to the callback function
    observer = new MutationObserver(loadCode);
    observer.observe(targetNode, config);
    console.log('loadContent');
}

function loadCode() {
    // Disconnect the observer
    observer.disconnect();

    // Insert code contents
    const codeElements = document.getElementsByTagName("code");

    console.log(codeElements.length);

    for (let i = 0; i < codeElements.length; i++) {
        const codeElementName = codeElements[i].innerHTML;

        console.log(codeElementName);

        fetch(codeElementName).then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            codeElements[i].innerHTML = data; // Inserts the text into the code block
        })
        .catch(error => {
            codeElements[i].innerHTML = `Error loading file: ${error}`;
        });
    }

    // Create an observer instance linked to the callback function
    if (codeElements.length > 0) {
        observer = new MutationObserver(highlightCode);
    }
    else {
        observer = new MutationObserver(loadCode);
    }
    observer.observe(targetNode, config);
    console.log('loadCode');
}

function highlightCode() {
    // Disconnect the observer
    observer.disconnect();

    // Highlight the code
    hljs.highlightAll();

    console.log('highlightCode');
}

function loadProject(projectName) {
    const contentElements = document.getElementsByClassName("textcontent");
    contentElements[0].id = projectName;
    loadContent();
}