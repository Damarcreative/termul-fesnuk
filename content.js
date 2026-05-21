console.log("FB TERMUL loaded");

let API = "http://localhost:3000";

function extractIdentity(link) {
    try {
        // Try to get ID from data-hovercard
        const hovercard = link.getAttribute("data-hovercard");
        if (hovercard) {
            const idMatch = hovercard.match(/id=(\d+)/);
            if (idMatch) {
                return { type: "id", value: idMatch[1] };
            }
        }
        
        const href = link.href;
        if (!href || !href.includes("facebook.com")) return null;

        const urlObj = new URL(href);
        const params = urlObj.searchParams;

        // Try from URL params
        if (params.get("id")) {
            return { type: "id", value: params.get("id") };
        }

        const path = urlObj.pathname;

        // Try from groups URL
        const groupUserMatch = path.match(/\/user\/(\d+)/);
        if (groupUserMatch) {
            return { type: "id", value: groupUserMatch[1] };
        }

        // Try from people URL (e.g. /people/Name/100012345)
        const peopleMatch = path.match(/\/people\/[^/]+\/(\d+)/);
        if (peopleMatch) {
            return { type: "id", value: peopleMatch[1] };
        }

        // Fallback to username only if no ID found and it's not a generic path
        const pathSegments = path.split('/').filter(p => p);
        if (pathSegments.length > 0) {
            const firstSegment = pathSegments[0];
            const ignoreList = [
                'people', 'groups', 'profile.php', 'pages', 'watch', 
                'marketplace', 'gaming', 'events', 'stories', 'reel', 
                'hashtag', 'photo.php', 'permalink.php'
            ];
            if (!ignoreList.includes(firstSegment.toLowerCase())) {
                return { type: "username", value: firstSegment };
            }
        }
    } catch (err) { }
    
    return null;
}

function createBadge() {
    const badge = document.createElement("span");
    badge.innerText = " TERMUL ";
    badge.style.background = "red";
    badge.style.color = "white";
    badge.style.padding = "2px 6px";
    badge.style.marginLeft = "8px";
    badge.style.borderRadius = "6px";
    badge.style.fontSize = "11px";
    badge.style.fontWeight = "bold";
    badge.style.verticalAlign = "middle";
    return badge;
}

function createActionTextButton(isActive) {
    const btn = document.createElement("div");
    btn.className = "termul-text-btn";
    btn.innerText = "Termul";
    btn.style.cursor = "pointer";
    btn.style.fontWeight = "bold";
    btn.style.fontSize = "12px";
    
    // Facebook uses var(--secondary-text) for normal action text which adapts to dark/light mode automatically
    btn.style.color = isActive ? "#ff4444" : "var(--secondary-text, #b0b3b8)";
    btn.style.marginLeft = "12px";
    
    btn.onmouseover = () => { btn.style.textDecoration = "underline"; };
    btn.onmouseout = () => { btn.style.textDecoration = "none"; };

    return btn;
}

function createIconButton() {
    const btn = document.createElement("div");
    const iconUrl = chrome.runtime.getURL("icons/icon16.png");
    
    btn.innerHTML = `<img src="${iconUrl}" style="width: 16px; height: 16px; display: block;" alt="Mark TERMUL" title="Tandai TERMUL" />`;
    btn.style.cursor = "pointer";
    btn.style.marginRight = "8px";
    btn.style.padding = "6px";
    btn.style.borderRadius = "50%";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    
    // Background pill to make the icon visible in both modes
    btn.style.backgroundColor = "var(--secondary-button-background, rgba(128, 128, 128, 0.2))"; 
    btn.onmouseover = () => { btn.style.backgroundColor = "var(--secondary-button-background-floating, rgba(128, 128, 128, 0.4))"; };
    btn.onmouseout = () => { btn.style.backgroundColor = "var(--secondary-button-background, rgba(128, 128, 128, 0.2))"; };

    return btn;
}

const userCache = new Map();

async function saveUser(data) {
    const identityType = data.fb_user_id ? "id" : "username";
    const identityValue = data.fb_user_id || data.fb_username;
    const cacheKey = `${identityType}_${identityValue}`;
    
    try {
        await fetch(`${API}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        userCache.set(cacheKey, { exists: true });
    } catch (err) {
        console.error(err);
    }
}

async function deleteUser(identity) {
    const cacheKey = `${identity.type}_${identity.value}`;
    try {
        await fetch(`${API}/remove/${identity.type}/${identity.value}`, {
            method: "DELETE"
        });
        userCache.set(cacheKey, { exists: false });
    } catch (err) {
        console.error(err);
    }
}

function getCommentText(container) {
    const spans = container.querySelectorAll("div[dir='auto']");
    let text = "";
    spans.forEach((s) => {
        const t = s.innerText?.trim();
        if (t && t.length > text.length) {
            text = t;
        }
    });
    return text;
}

function applyTermulToArticle(article, authorLink, identity, isTermul) {
    const toggleBadge = (show) => {
        let badge = authorLink.parentElement.querySelector(".termul-badge");
        if (show && !badge) {
            badge = createBadge();
            badge.className = "termul-badge";
            authorLink.parentElement.appendChild(badge);
        } else if (!show && badge) {
            badge.remove();
        }
    };
    toggleBadge(isTermul);

    const isComment = article.getAttribute("aria-label")?.toLowerCase().includes("comment") || 
                      article.getAttribute("aria-label")?.toLowerCase().includes("komentar") ||
                      article.closest("ul") !== null;

    const handleToggle = async (btn) => {
        if (isTermul) {
            await deleteUser(identity);
            isTermul = false;
        } else {
            await saveUser({
                fb_user_id: identity.type === "id" ? identity.value : "",
                fb_username: identity.type === "username" ? identity.value : "",
                profile_url: authorLink.href,
                comment_url: location.href,
                comment_text: getCommentText(article),
                display_name: authorLink.innerText,
                label: "TERMUL"
            });
            isTermul = true;
        }

        if (btn && btn.classList.contains("termul-text-btn")) {
            btn.style.color = isTermul ? "#ff4444" : "var(--secondary-text, #b0b3b8)";
        }
        toggleBadge(isTermul);
    };

    if (isComment) {
        if (!article.querySelector(".termul-text-btn")) {
            const buttons = article.querySelectorAll('div[role="button"], span');
            let replyBtn = null;
            for (const b of buttons) {
                const text = b.innerText?.trim().toLowerCase();
                if (text === "balas" || text === "reply") {
                    replyBtn = b;
                    break;
                }
            }

            const btn = createActionTextButton(isTermul);
            btn.onclick = () => handleToggle(btn);

            if (replyBtn) {
                replyBtn.parentElement.insertBefore(btn, replyBtn.nextSibling);
                replyBtn.parentElement.style.display = "flex";
                replyBtn.parentElement.style.alignItems = "center";
            } else {
                authorLink.parentElement.appendChild(btn);
            }
        }
    } else {
        const menus = article.querySelectorAll("div[aria-haspopup='menu']");
        let threeDots = null;
        for (const menu of menus) {
            if (menu.querySelector("svg") || menu.querySelector("i")) {
                threeDots = menu;
                break;
            }
        }

        if (threeDots) {
            if (!threeDots.parentElement.querySelector(".termul-btn-icon")) {
                const iconBtn = createIconButton();
                iconBtn.className = "termul-btn-icon";
                iconBtn.onclick = () => handleToggle(iconBtn);
                
                threeDots.parentElement.style.display = "flex";
                threeDots.parentElement.style.alignItems = "center";
                threeDots.parentElement.insertBefore(iconBtn, threeDots);
            }
        } else {
            if (!authorLink.parentElement.querySelector(".termul-text-btn")) {
                const btn = createActionTextButton(isTermul);
                btn.onclick = () => handleToggle(btn);
                authorLink.parentElement.appendChild(btn);
            }
        }
    }
}

let isExtensionEnabled = true;

async function scanArticles() {
    if (!isExtensionEnabled) return;

    const articles = document.querySelectorAll("[role='article']");
    const pendingCheck = [];
    const articleDataList = [];

    for (const article of articles) {
        if (article.dataset.termulProcessed === "1") continue;
        
        const links = article.querySelectorAll("a");
        let authorLink = null;
        let identity = null;

        for (const link of links) {
            if (!link.href || !link.href.includes("facebook.com")) continue;

            const text = link.innerText?.trim() || "";
            if (text.length > 0 && text.length < 60) {
                const id = extractIdentity(link);
                if (id) {
                    authorLink = link;
                    identity = id;
                    break;
                }
            }
        }

        if (!authorLink || !identity) continue;
        
        article.dataset.termulProcessed = "1"; // Mark immediately to prevent duplicate checks

        const cacheKey = `${identity.type}_${identity.value}`;
        if (userCache.has(cacheKey)) {
            applyTermulToArticle(article, authorLink, identity, userCache.get(cacheKey).exists);
        } else {
            // Ensure unique pending checks
            if (!pendingCheck.some(i => i.type === identity.type && i.value === identity.value)) {
                pendingCheck.push(identity);
            }
            articleDataList.push({ article, authorLink, identity, cacheKey });
        }
    }
    
    if (pendingCheck.length > 0) {
        try {
            const res = await fetch(`${API}/check-batch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identities: pendingCheck })
            });
            if (!res.ok) throw new Error("API not ok");
            const termulUsers = await res.json();
            
            const termulSet = new Set(
                termulUsers.map(u => u.fb_user_id)
                    .concat(termulUsers.map(u => u.fb_username))
                    .filter(v => v)
            );
            
            for (const item of articleDataList) {
                const isTermul = termulSet.has(item.identity.value);
                userCache.set(item.cacheKey, { exists: isTermul });
                applyTermulToArticle(item.article, item.authorLink, item.identity, isTermul);
            }
        } catch (err) {
            console.error("Batch check error", err);
            // Apply fallback so UI still renders even if server is down/not updated
            for (const item of articleDataList) {
                userCache.set(item.cacheKey, { exists: false });
                applyTermulToArticle(item.article, item.authorLink, item.identity, false);
            }
        }
    }
}

// Start processing and observe mutations
chrome.storage.local.get(["enabled", "serverUrl"], (result) => {
    if (result.enabled !== undefined) isExtensionEnabled = result.enabled;
    if (result.serverUrl) API = result.serverUrl;
    
    scanArticles();

    const observer = new MutationObserver(() => {
        scanArticles();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

// Update API immediately if settings change
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local") {
        if (changes.enabled) {
            isExtensionEnabled = changes.enabled.newValue;
        }
        if (changes.serverUrl) {
            API = changes.serverUrl.newValue;
            userCache.clear();
        }
        scanArticles();
    }
});