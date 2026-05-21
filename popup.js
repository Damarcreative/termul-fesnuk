const toggle = document.getElementById("toggleMode");
const serverUrlInput = document.getElementById("serverUrl");
const saveServerBtn = document.getElementById("saveServerBtn");
const serverStatus = document.getElementById("serverStatus");
const searchInput = document.getElementById("searchInput");
const tbody = document.querySelector("#dataTable tbody");

let currentServer = "http://localhost:3000";
let allData = [];

// Load saved state
chrome.storage.local.get(["enabled", "serverUrl"], (result) => {
    toggle.checked = result.enabled !== false;
    if (result.serverUrl) {
        currentServer = result.serverUrl;
    }
    serverUrlInput.value = currentServer;
    pingServer();
});

toggle.addEventListener("change", () => {
    chrome.storage.local.set({ enabled: toggle.checked });
});

saveServerBtn.addEventListener("click", () => {
    let val = serverUrlInput.value.trim();
    if (val.endsWith("/")) {
        val = val.slice(0, -1);
    }
    currentServer = val;
    chrome.storage.local.set({ serverUrl: currentServer }, () => {
        pingServer();
    });
});

async function pingServer() {
    serverStatus.innerText = "Checking...";
    serverStatus.style.color = "orange";
    
    try {
        const res = await fetch(`${currentServer}/ping`);
        if (res.ok) {
            serverStatus.innerText = "Connected";
            serverStatus.style.color = "green";
            loadData();
        } else {
            throw new Error("Not OK");
        }
    } catch (err) {
        serverStatus.innerText = "Disconnected";
        serverStatus.style.color = "red";
        tbody.innerHTML = "<tr><td colspan='2'>Failed to connect</td></tr>";
    }
}

async function loadData() {
    try {
        const res = await fetch(`${currentServer}/all`);
        const data = await res.json();
        allData = data;
        renderTable(allData);
    } catch (err) {
        console.error(err);
    }
}

function renderTable(data) {
    tbody.innerHTML = "";
    if (data.length === 0) {
        tbody.innerHTML = "<tr><td colspan='2'>Data kosong</td></tr>";
        return;
    }
    
    data.forEach(item => {
        const tr = document.createElement("tr");
        
        const tdName = document.createElement("td");
        tdName.innerText = item.display_name || item.fb_username || item.fb_user_id || "-";
        
        const tdLink = document.createElement("td");
        const a = document.createElement("a");
        a.href = item.profile_url;
        a.target = "_blank";
        a.innerText = "Profile";
        tdLink.appendChild(a);
        
        tr.appendChild(tdName);
        tr.appendChild(tdLink);
        tbody.appendChild(tr);
    });
}

searchInput.addEventListener("input", (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = allData.filter(item => {
        const name = (item.display_name || item.fb_username || item.fb_user_id || "").toLowerCase();
        return name.includes(keyword);
    });
    renderTable(filtered);
});