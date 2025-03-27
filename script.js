document.addEventListener("DOMContentLoaded", function() {
    let currentModule = null;
    let hasChanges = false;

    function showModule(module) {
        document.getElementById("home").classList.add("hidden");
        document.getElementById("srt").classList.add("hidden");
        document.getElementById("rr").classList.add("hidden");
        document.getElementById(module).classList.remove("hidden");
        currentModule = module;
    }

    function confirmBack() {
        if (hasChanges && confirm("You have unsaved changes. Are you sure you want to go back?")) {
            goBack();
        } else if (!hasChanges) {
            goBack();
        }
    }

    function goBack() {
        document.getElementById("home").classList.remove("hidden");
        document.getElementById("srt").classList.add("hidden");
        document.getElementById("rr").classList.add("hidden");
        hasChanges = false;
    }

    function addProcess(type) {
        let container = document.getElementById(type === "srt" ? "process-container" : "rr-container");
        let processCount = container.children.length + 1;
        let div = document.createElement("div");
        div.classList.add("process-entry");

        div.innerHTML = `
            <input type="text" value="P${processCount}" disabled>
            <input type="number" placeholder="Arrival Time" class="arrival">
            <input type="number" placeholder="Burst Time" class="burst">
            <button>Remove</button>
        `;
    
        container.appendChild(div);
        hasChanges = true;
    }
    
    document.addEventListener("click", function(event) {
        if (event.target.tagName === "BUTTON" && event.target.textContent === "Remove") {
            let button = event.target;
            while (!button.classList.contains("process-entry")) {
                button = button.parentElement;
            }
            button.remove();
            hasChanges = true;
        }
    });
    

    function calculateSRT() {
        let processes = [];
        document.querySelectorAll("#process-container div").forEach((div, index) => {
            let arrival = parseInt(div.children[1].value) || 0;
            let burst = parseInt(div.children[2].value) || 0;
            processes.push({ id: `P${index + 1}`, arrival, burst });
        });
        displayResults("srt-output", processes);
        hasChanges = true;
    }

    function calculateRR() {
        let timeQuantum = parseInt(document.getElementById("time-quantum").value) || 1;
        let processes = [];
        document.querySelectorAll("#rr-container div").forEach((div, index) => {
            let arrival = parseInt(div.children[1].value) || 0;
            let burst = parseInt(div.children[2].value) || 0;
            processes.push({ id: `P${index + 1}`, arrival, burst });
        });
        displayResults("rr-output", processes, timeQuantum);
        hasChanges = true;
    }

    function displayResults(outputId, processes, timeQuantum = null) {
        let output = document.getElementById(outputId);
        let ganttChart = document.getElementById(outputId + "-gantt");
        ganttChart.innerHTML = ""; // Clear previous chart

        let tableHTML = `<table border="1">
            <tr><th>Process</th><th>Arrival Time</th><th>Burst Time</th><th>Waiting Time</th><th>Turnaround Time</th></tr>`;

        let totalWT = 0, totalTAT = 0;
        let currentTime = 0;
        let ganttHTML = `<div class="gantt-bar">`;

        processes.forEach((p, i) => {
            let wt = Math.max(0, currentTime - p.arrival); // Waiting time
            let tat = wt + p.burst; // Turnaround time
            totalWT += wt;
            totalTAT += tat;

            tableHTML += `<tr><td>${p.id}</td><td>${p.arrival}</td><td>${p.burst}</td><td>${wt}</td><td>${tat}</td></tr>`;

            // Add to Gantt chart
            ganttHTML += `<div class="process" style="width:${p.burst * 30}px">${p.id}</div>`;
            currentTime += p.burst;
        });

        let avgWT = (totalWT / processes.length).toFixed(2);
        let avgTAT = (totalTAT / processes.length).toFixed(2);
        tableHTML += `<tr><td colspan="3">Average</td><td>${avgWT}</td><td>${avgTAT}</td></tr></table>`;

        ganttHTML += `</div>`;
        output.innerHTML = tableHTML;
        ganttChart.innerHTML = ganttHTML;
    }

    window.showModule = showModule;
    window.confirmBack = confirmBack;
    window.addProcess = addProcess;
    window.calculateSRT = calculateSRT;
    window.calculateRR = calculateRR;
});
