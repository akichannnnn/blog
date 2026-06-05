interface SponsorVerifyResponse {
    loggedIn: boolean;
    isSponsor: boolean;
    userName?: string;
}

function getConfig(): { authApiUrl: string } | null {
    const config = (window as unknown as { SponsorConfig?: { authApiUrl: string } }).SponsorConfig;
    if (!config) return null;
    return { authApiUrl: config.authApiUrl || '' };
}

function unlockContent(): void {
    const template = document.getElementById('sponsor-full-content') as HTMLTemplateElement | null;
    const wall = document.querySelector('.sponsor-wall');
    const content = document.querySelector('.article-content');

    if (!template?.innerHTML || !content) return;

    content.insertAdjacentHTML('beforeend', template.innerHTML);
    content.classList.add('article-content--unlocked');
    wall?.classList.add('sponsor-wall--unlocked');
    template.remove();
}

function updateUI(data: SponsorVerifyResponse): void {
    const status = document.getElementById('sponsor-status');
    const userEl = document.getElementById('sponsor-user');
    const loginBtn = document.getElementById('sponsor-login-btn');
    const logoutBtn = document.getElementById('sponsor-logout-btn');

    if (data.loggedIn) {
        if (status && userEl) {
            status.hidden = false;
            userEl.textContent = `已登录：${data.userName ?? ''}`.trim();
        }
        loginBtn?.setAttribute('hidden', '');
        logoutBtn?.removeAttribute('hidden');
    } else {
        loginBtn?.removeAttribute('hidden');
        logoutBtn?.setAttribute('hidden', '');
    }

    if (data.isSponsor) {
        unlockContent();
    }
}

async function verifySponsor(authApiUrl: string): Promise<SponsorVerifyResponse> {
    const res = await fetch(`${authApiUrl}/verify`, { credentials: 'include' });
    if (!res.ok) {
        return { loggedIn: false, isSponsor: false };
    }
    return res.json();
}

function showInactiveNotice(): void {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sponsor') !== 'inactive') return;

    const message = document.querySelector('.sponsor-wall__message');
    if (message) {
        message.textContent = '已登录，但未检测到有效赞助订阅。请先赞助后再试。';
    }

    params.delete('sponsor');
    const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', cleanUrl);
}

export function initSponsorUnlock(): void {
    const wall = document.querySelector('.sponsor-wall');
    if (!wall) return;

    const config = getConfig();
    if (!config) return;

    const authApiUrl = config.authApiUrl?.replace(/\/$/, '');

    showInactiveNotice();

    const loginBtn = document.getElementById('sponsor-login-btn');
    if (!authApiUrl) {
        loginBtn?.setAttribute('disabled', '');
        return;
    }

    loginBtn?.removeAttribute('disabled');
    loginBtn?.addEventListener('click', () => {
        const returnTo = encodeURIComponent(window.location.href);
        window.location.href = `${authApiUrl}/login?return_to=${returnTo}`;
    });

    document.getElementById('sponsor-logout-btn')?.addEventListener('click', async () => {
        await fetch(`${authApiUrl}/logout`, { method: 'POST', credentials: 'include' });
        window.location.reload();
    });

    verifySponsor(authApiUrl).then(updateUI).catch(() => {
        // 验证服务不可用时保持赞助墙
    });
}
