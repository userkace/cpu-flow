document.addEventListener("DOMContentLoaded", function () {
    // Prevent negative number inputs
    document.addEventListener('input', function (event) {
        if (event.target.type === 'number') {
            // Remove negative sign if entered
            if (event.target.value.startsWith('-')) {
                event.target.value = event.target.value.replace('-', '');
            }

            // Ensure minimum value is 0
            const value = parseFloat(event.target.value);
            if (isNaN(value) || value < 0) {
                event.target.value = '';
            }
        }
    });

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

        // Clear SRT outputs
        document.getElementById("srt-output").innerHTML = "";
        document.getElementById("srt-output-gantt").innerHTML = "";
        document.getElementById("srt-output-container").classList.add("hidden");

        // Clear RR outputs
        document.getElementById("rr-output").innerHTML = "";
        document.getElementById("rr-output-gantt").innerHTML = "";
        document.getElementById("rr-output-container").classList.add("hidden");

        // Clear process containers
        document.getElementById("process-container").innerHTML = "";
        document.getElementById("rr-container").innerHTML = "";

        hasChanges = false;
    }

    function addProcess(type) {
        let container = document.getElementById(type === "srt" ? "process-container" : "rr-container");
        let processCount = container.children.length + 1;
        let div = document.createElement("div");
        div.classList.add("process-entry");
        div.classList.add("py-0");
        div.classList.add("my-0.5");

        container.querySelectorAll('.remove-btn').forEach(btn => {
            btn.classList.add('hidden');
        });

        div.innerHTML = `
            <input type="text" value="P${processCount}" class="w-[4rem]" disabled>
            <input type="number" placeholder="Arrival Time" class="arrival outline-none bg-transparent rounded-lg border-3 border-neutral-600 px-2" min="0" step="1" pattern="[0-9]*" inputmode="numeric">
            <input type="number" placeholder="Burst Time" class="burst outline-none bg-transparent rounded-lg border-3 border-neutral-600 px-2" min="0" step="1" pattern="[0-9]*" inputmode="numeric">
            <button class="remove-btn bg-neutral-800 rounded-lg h-[1.5rem] w-[1.5rem] items-center justify-center cursor-pointer text-red-400">✕</button>
            `;

        container.appendChild(div);
        hasChanges = true;
    }

    document.addEventListener("click", function (event) {
        const removeButton = event.target.closest('.remove-btn');

        if (removeButton) {
            const processEntry = removeButton.closest('.process-entry');

            if (!processEntry.classList.contains('first-process')) {
                processEntry.remove();
                const container = document.getElementById(currentModule === 'srt' ? 'process-container' : 'rr-container');
                const lastProcess = container.lastElementChild;
                if (lastProcess) {
                    const lastRemoveBtn = lastProcess.querySelector('.remove-btn');
                    if (lastRemoveBtn) {
                        lastRemoveBtn.classList.remove('hidden');
                    }
                }

                hasChanges = true;
            }
        }
    });

    function calculateSRT() {
        // Input validation
        let processContainer = document.getElementById("process-container");
        if (processContainer.children.length === 0) {
            alert("Please add at least one process for SRT calculation.");
            return;
        }

        let processes = [];
        let missingProcesses = [];
        document.querySelectorAll("#process-container div").forEach((div, index) => {
            let arrival = div.children[1].value.trim();
            let burst = div.children[2].value.trim();

            if (arrival === '' || burst === '') {
                missingProcesses.push(`P${index + 1}`);
            } else {
                arrival = parseInt(arrival) || 0;
                burst = parseInt(burst) || 0;
                processes.push({
                    id: `P${index + 1}`,
                    arrival: arrival,
                    burst: burst,
                    remaining: burst,
                    completionTime: 0,
                    waitingTime: 0,
                    turnaroundTime: 0
                });
            }
        });

        if (missingProcesses.length > 0) {
            alert(`Please fill in all details for the following processes: ${missingProcesses.join(', ')}`);
            return;
        }

        let output = document.getElementById("srt-output");
        let ganttChart = document.getElementById("srt-output-gantt");
        output.innerHTML = ""; // Clear previous output
        ganttChart.innerHTML = ""; // Clear previous chart

        // Show output container
        document.getElementById("srt-output-container").classList.remove("hidden");

        // Sort processes by arrival time
        processes.sort((a, b) => a.arrival - b.arrival);

        let currentTime = 0;
        let completed = 0;
        let ganttHTML = `<div class="gantt-bar">`;

        // SRTF scheduling logic
        while (completed < processes.length) {
            // Find the process with the shortest remaining time
            let shortestProcessIndex = -1;
            for (let i = 0; i < processes.length; i++) {
                // Check if process has arrived and is not completed
                if (processes[i].arrival <= currentTime && processes[i].remaining > 0) {
                    // Select process with shortest remaining time
                    if (shortestProcessIndex === -1 ||
                        processes[i].remaining < processes[shortestProcessIndex].remaining) {
                        shortestProcessIndex = i;
                    }
                }
            }

            // If no process is found, increment time
            if (shortestProcessIndex === -1) {
                currentTime++;
                continue;
            }

            // Execute the shortest process
            let currentProcess = processes[shortestProcessIndex];

            // Update Gantt chart
            ganttHTML += `<div class="process" style="width:30px">${currentProcess.id}</div>`;

            // Reduce remaining time
            currentProcess.remaining--;
            currentTime++;

            // Check if process is completed
            if (currentProcess.remaining === 0) {
                currentProcess.completionTime = currentTime;
                currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrival;
                currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burst;
                completed++;
            }
        }

        // Optimize Gantt chart generation
        let combinedGanttProcesses = [];
        let currentProcess = null;

        // Extract process IDs from the original Gantt chart HTML
        let processMatches = ganttHTML.match(/class="process" style="width:30px">([^<]+)</g) || [];
        let processArray = processMatches.map(match => match.match(/>([^<]+)</)[1]);

        // Combine consecutive processes
        processArray.forEach((processId, index) => {
            if (!currentProcess) {
                currentProcess = {
                    id: processId,
                    width: 30
                };
            } else if (currentProcess.id === processId) {
                // Extend width if same process
                currentProcess.width += 30;
            } else {
                // Different process, save previous and start new
                combinedGanttProcesses.push(currentProcess);
                currentProcess = {
                    id: processId,
                    width: 30
                };
            }

            // Add last process if it's the last iteration
            if (index === processArray.length - 1) {
                combinedGanttProcesses.push(currentProcess);
            }
        });

        // Only generate Gantt chart if there are processes
        if (combinedGanttProcesses.length > 0) {
            ganttHTML = `<div class="gantt-bar">`;

            // Find the lowest arrival time to use as the start time
            let lowestArrivalTime = Math.min(...processes.map(p => p.arrival));
            let currentTime = lowestArrivalTime;

            combinedGanttProcesses.forEach((p, index) => {
                // Add time before the first process or between processes
                if (index === 0 || index > 0) {
                    ganttHTML += `<div class="time">${currentTime}</div>`;
                }

                // Add process block
                ganttHTML += `<div class="process" style="width:${p.width}px">${p.id}</div>`;

                // Update current time
                currentTime += p.width / 30;
            });

            // Add final time at the end
            ganttHTML += `<div class="time">${currentTime}</div>`;

            ganttHTML += `</div>`;
            ganttChart.innerHTML = ganttHTML;
        } else {
            ganttChart.innerHTML = ""; // Clear chart if no processes
        }

        // Generate output table
        let tableHTML = `<table border="1">
            <tr><th>Process</th><th>Arrival Time</th><th>Burst Time</th><th>Waiting Time</th><th>Turnaround Time</th></tr>`;

        let totalWT = 0,
            totalTAT = 0;
        processes.forEach(p => {
            tableHTML += `<tr>
                <td>${p.id}</td>
                <td>${p.arrival}</td>
                <td>${p.burst}</td>
                <td>${p.waitingTime}</td>
                <td>${p.turnaroundTime}</td>
            </tr>`;
            totalWT += p.waitingTime;
            totalTAT += p.turnaroundTime;
        });

        let avgWT = (totalWT / processes.length).toFixed(2);
        let avgTAT = (totalTAT / processes.length).toFixed(2);
        tableHTML += `<tr><td colspan="3">Average</td><td>${avgWT}</td><td>${avgTAT}</td></tr></table>`;

        output.innerHTML = tableHTML;
        hasChanges = false;
    }

    function calculateRR() {
        // Input validation
        let processContainer = document.getElementById("rr-container");
        let timeQuantumInput = document.getElementById("time-quantum");

        if (processContainer.children.length === 0) {
            alert("Please add at least one process for Round Robin calculation.");
            return;
        }

        if (timeQuantumInput.value.trim() === '') {
            alert("Please enter a time quantum.");
            return;
        }

        let timeQuantum = parseInt(timeQuantumInput.value) || 0;
        if (timeQuantum <= 0) {
            alert("Time quantum must be a positive number.");
            return;
        }

        let processes = [];
        let missingProcesses = [];
        document.querySelectorAll("#rr-container div").forEach((div, index) => {
            let arrival = div.children[1].value.trim();
            let burst = div.children[2].value.trim();

            if (arrival === '' || burst === '') {
                missingProcesses.push(`P${index + 1}`);
            } else {
                arrival = parseInt(arrival) || 0;
                burst = parseInt(burst) || 0;
                processes.push({
                    id: `P${index + 1}`,
                    arrival: arrival,
                    burst: burst,
                    remaining: burst,
                    completionTime: 0,
                    waitingTime: 0,
                    turnaroundTime: 0
                });
            }
        });

        if (missingProcesses.length > 0) {
            alert(`Please fill in all details for the following processes: ${missingProcesses.join(', ')}`);
            return;
        }

        let output = document.getElementById("rr-output");
        let ganttChart = document.getElementById("rr-output-gantt");
        output.innerHTML = ""; // Clear previous output
        ganttChart.innerHTML = ""; // Clear previous chart

        // Show output container
        document.getElementById("rr-output-container").classList.remove("hidden");

        // Sort processes by arrival time
        processes.sort((a, b) => a.arrival - b.arrival);

        // Prepare arrays for calculations
        let n = processes.length;
        let processIds = processes.map(p => p.id);
        let burstTimes = processes.map(p => p.burst);

        // Perform Round Robin scheduling
        let rem_bt = [...burstTimes]; // Remaining burst times
        let wt = new Array(n).fill(0); // Waiting times
        let tat = new Array(n).fill(0); // Turnaround times
        let currentTime = 0;
        let completed = new Array(n).fill(false);
        let completionOrder = [];

        // Gantt chart tracking
        let ganttHTML = `<div class="gantt-bar">`;

        // Round Robin scheduling logic
        while (completed.some(status => !status)) {
            let processExecuted = false;

            for (let i = 0; i < n; i++) {
                // Skip if process is already completed or hasn't arrived
                if (completed[i] || processes[i].arrival > currentTime) continue;

                // Determine execution time
                let executeTime = Math.min(timeQuantum, rem_bt[i]);

                // Update Gantt chart
                ganttHTML += `<div class="process" style="width:${executeTime * 30}px">${processIds[i]}</div>`;

                // Update current time and remaining burst time
                currentTime += executeTime;
                rem_bt[i] -= executeTime;

                // Check if process is completed
                if (rem_bt[i] <= 0) {
                    completed[i] = true;
                    completionOrder.push(i);

                    // Calculate waiting time and turnaround time
                    tat[i] = currentTime - processes[i].arrival;
                    wt[i] = tat[i] - burstTimes[i];
                }

                processExecuted = true;
            }

            // If no process was executed, increment time
            if (!processExecuted) {
                currentTime++;
            }
        }

        // Optimize Gantt chart generation
        let combinedGanttProcesses = [];
        let currentProcess = null;

        // Extract process IDs from the original Gantt chart HTML
        let processMatches = ganttHTML.match(/class="process" style="width:([^<]+)px">([^<]+)</g) || [];
        let processArray = processMatches.map(match => match.match(/>([^<]+)</)[1]);

        // Combine consecutive processes
        processArray.forEach((processId, index) => {
            if (!currentProcess) {
                currentProcess = {
                    id: processId,
                    width: 30
                };
            } else if (currentProcess.id === processId) {
                // Extend width if same process
                currentProcess.width += 30;
            } else {
                // Different process, save previous and start new
                combinedGanttProcesses.push(currentProcess);
                currentProcess = {
                    id: processId,
                    width: 30
                };
            }

            // Add last process if it's the last iteration
            if (index === processArray.length - 1) {
                combinedGanttProcesses.push(currentProcess);
            }
        });

        // Only generate Gantt chart if there are processes
        if (combinedGanttProcesses.length > 0) {
            ganttHTML = `<div class="gantt-bar">`;

            // Find the lowest arrival time to use as the start time
            let lowestArrivalTime = Math.min(...processes.map(p => p.arrival));
            let currentTime = lowestArrivalTime;

            combinedGanttProcesses.forEach((p, index) => {
                // Add time before the first process or between processes
                if (index === 0 || index > 0) {
                    ganttHTML += `<div class="time">${currentTime}</div>`;
                }

                // Add process block
                ganttHTML += `<div class="process" style="width:${p.width}px">${p.id}</div>`;

                // Update current time
                currentTime += p.width / 30;
            });

            // Add final time at the end
            ganttHTML += `<div class="time">${currentTime}</div>`;

            ganttHTML += `</div>`;
            ganttChart.innerHTML = ganttHTML;
        } else {
            ganttChart.innerHTML = ""; // Clear chart if no processes
        }

        // Generate output table
        let tableHTML = `<table border="1">
            <tr><th>Process</th><th>Arrival Time</th><th>Burst Time</th><th>Waiting Time</th><th>Turnaround Time</th></tr>`;

        let totalWT = 0,
            totalTAT = 0;
        completionOrder.forEach(i => {
            tableHTML += `<tr>
                <td>${processIds[i]}</td>
                <td>${processes[i].arrival}</td>
                <td>${burstTimes[i]}</td>
                <td>${wt[i]}</td>
                <td>${tat[i]}</td>
            </tr>`;
            totalWT += wt[i];
            totalTAT += tat[i];
        });

        let avgWT = (totalWT / n).toFixed(2);
        let avgTAT = (totalTAT / n).toFixed(2);
        tableHTML += `<tr><td colspan="3">Average</td><td>${avgWT}</td><td>${avgTAT}</td></tr></table>`;

        output.innerHTML = tableHTML;
        ganttChart.innerHTML = ganttHTML;

        hasChanges = false;
    }

    window.showModule = showModule;
    window.confirmBack = confirmBack;
    window.addProcess = addProcess;
    window.calculateSRT = calculateSRT;
    window.calculateRR = calculateRR;
});