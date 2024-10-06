document.addEventListener('DOMContentLoaded', (event) => {
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

    // Insert code contents
    setTimeout(() => {
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
    }, 100);

    setTimeout(() => {
        hljs.highlightAll();
    }, 500);
}

function loadProject(projectName) {
    const contentElements = document.getElementsByClassName("textcontent");
    contentElements[0].id = projectName;
    loadContent();
}