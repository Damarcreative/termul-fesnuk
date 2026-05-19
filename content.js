console.log("FB TERMUL loaded");

const API = "http://localhost:3000";

function extractIdentity(url) {
    try {
        const cleanUrl = url.split("?")[0];

        const idMatch = cleanUrl.match(/id=(\d+)/);
        if (idMatch) {
            return {
                type: "id",
                value: idMatch[1]
            };
        }

        const groupUserMatch = cleanUrl.match(/\/user\/(\d+)/);
        if (groupUserMatch) {
            return {
                type: "id",
                value: groupUserMatch[1]
            };
        }

        const usernameMatch = cleanUrl.match(/facebook\.com\/([^/?]+)/);
        if (usernameMatch) {
            return {
                type: "username",
                value: usernameMatch[1]
            };
        }

        return null;
    } catch (err) {
        return null;
    }
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
    btn.style.color = isActive ? "red" : "inherit";
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
    
    btn.onmouseover = () => { btn.style.background = "rgba(255, 0, 0, 0.1)"; };
    btn.onmouseout = () => { btn.style.background = "transparent"; };

    return btn;
}

const userCache = new Map();

async function checkUser(identity) {
    const cacheKey = `${identity.type}_${identity.value}`;
    if (userCache.has(cacheKey)) {
        return userCache.get(cacheKey);
    }
    
    try {
        const response = await fetch(`${API}/check/${identity.type}/${identity.value}`);
        const data = await response.json();
        userCache.set(cacheKey, data);
        return data;
    } catch (err) {
        return { exists: false };
    }
}

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

async function processArticle(article) {
    if (article.dataset.termulProcessed === "1") return;
    article.dataset.termulProcessed = "1";

    const links = article.querySelectorAll("a[href*='facebook.com']");
    let authorLink = null;
    let identity = null;

    // Find the first valid textual profile link (likely the author)
    for (const link of links) {
        const text = link.innerText.trim();
        const hasImg = link.querySelector('img, svg, image');
        
        if (text.length > 0 && text.length < 60 && !hasImg) {
            const id = extractIdentity(link.href);
            if (id) {
                authorLink = link;
                identity = id;
                break;
            }
        }
    }

    if (!authorLink || !identity) return;

    const result = await checkUser(identity);
    let isTermul = result.exists;

    // 1. Give TERMUL badge to the right of the name
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

    // Determine if it's a comment or a post
    const isComment = article.getAttribute("aria-label")?.toLowerCase().includes("comment") || 
                      article.getAttribute("aria-label")?.toLowerCase().includes("komentar") ||
                      article.closest("ul") !== null;

    const handleToggle = async (btn) => {
        if (isTermul) {
            await deleteUser(identity);
            isTermul = false;
            // alert("User dihapus dari TERMUL");
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
            // alert("User ditandai TERMUL");
        }

        if (btn && btn.classList.contains("termul-text-btn")) {
            btn.style.color = isTermul ? "red" : "inherit";
        }
        toggleBadge(isTermul);
    };

    if (isComment) {
        // 2. Button in comments next to "Balas" / "Reply"
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
        // 3. Icon Button in posts, right next to the three dots
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
            // Fallback if three dots not found
            if (!authorLink.parentElement.querySelector(".termul-text-btn")) {
                const btn = createActionTextButton(isTermul);
                btn.onclick = () => handleToggle(btn);
                authorLink.parentElement.appendChild(btn);
            }
        }
    }
}

async function scanArticles() {
    chrome.storage.local.get(["enabled"], async (result) => {
        if (result.enabled === false) return;

        const articles = document.querySelectorAll("div[role='article']");
        for (const article of articles) {
            try {
                await processArticle(article);
            } catch (err) {}
        }
    });
}

scanArticles();

const observer = new MutationObserver(() => {
    scanArticles();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});