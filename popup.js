const toggle = document.getElementById("toggleMode");
const clearBtn = document.getElementById("clearData");

chrome.storage.local.get(["enabled"], (result) => {
    toggle.checked = result.enabled !== false;
});

toggle.addEventListener("change", () => {
    chrome.storage.local.set({
        enabled: toggle.checked
    });
});

clearBtn.addEventListener("click", async () => {
    await fetch("http://localhost:3000/clear", {
        method: "POST"
    });

    alert("Database cleared");
});