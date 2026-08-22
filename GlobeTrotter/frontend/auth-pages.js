const AUTH_API='../backend/api.php';

async function authApi(action, options={}) {
  const response = await fetch(`${AUTH_API}?action=${action}`, {
    method: options.method || 'GET',
    headers: {'Content-Type':'application/json'},
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error || 'Request failed.');
  return data;
}


function preserveAuthLinks() {
  const redirectTo = new URLSearchParams(window.location.search).get('redirectTo');
  if (!redirectTo) return;
  document.querySelectorAll('a[href$="login.html"], a[href$="signup.html"]').forEach(link => {
    const url = new URL(link.getAttribute('href'), window.location.href);
    url.searchParams.set('redirectTo', redirectTo);
    link.href = url.pathname.split('/').pop() + '?' + url.searchParams.toString();
  });
}

function getRedirectTarget() {
  const target = new URLSearchParams(window.location.search).get('redirectTo');
  return target || '/dashboard';
}

function continueAfterAuth() {
  const target = getRedirectTarget();
  if (target === '/trips/new') {
    window.location.href = 'new-trip.html';
    return;
  }
  if (target === '/dashboard' || target === '/') {
    window.location.href = 'index.html?app=1';
    return;
  }
  const page = target.replace(/^\//, '');
  window.location.href = `index.html?app=1&view=${encodeURIComponent(page)}`;
}

function showMessage(message, type='error') {
  const el = document.querySelector('[data-auth-message]');
  if (!el) return;
  el.textContent = message;
  el.className = `auth-page-message ${type}`;
}

async function redirectIfLoggedIn() {
  try {
    const data = await authApi('me');
    if (data.user) continueAfterAuth();
  } catch (_) {}
}

async function setupLogin() {
  const form = document.querySelector('#standaloneLoginForm');
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    showMessage('Signing in…', 'info');
    try {
      await authApi('login', {
        method: 'POST',
        body: {
          login: document.querySelector('#loginIdentifier').value.trim(),
          password: document.querySelector('#loginPassword').value,
          remember: document.querySelector('#rememberMe')?.checked || false
        }
      });
      continueAfterAuth();
    } catch (error) {
      showMessage(error.message);
      button.disabled = false;
    }
  });

  document.querySelector('[data-toggle-password]')?.addEventListener('click', () => {
    const input = document.querySelector('#loginPassword');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
}

async function setupSignup() {
  const form = document.querySelector('#standaloneSignupForm');
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.querySelector('#signupPassword').value;
    const confirm = document.querySelector('#signupConfirmPassword').value;
    if (password !== confirm) {
      showMessage('Passwords do not match.');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    showMessage('Creating your account…', 'info');
    try {
      await authApi('signup', {
        method: 'POST',
        body: {
          name: document.querySelector('#signupName').value.trim(),
          username: document.querySelector('#signupUsername').value.trim(),
          email: document.querySelector('#signupEmail').value.trim(),
          password,
          confirm_password: confirm
        }
      });
      continueAfterAuth();
    } catch (error) {
      showMessage(error.message);
      button.disabled = false;
    }
  });
}

async function setupLogout() {
  try {
    await authApi('logout', {method:'POST'});
    showMessage('You have been logged out safely.', 'success');
  } catch (error) {
    showMessage(error.message);
  }
  setTimeout(() => { window.location.href = 'index.html?app=1'; }, 700);
}

document.addEventListener('DOMContentLoaded', () => {
  preserveAuthLinks();
  const page = document.body.dataset.authPage;
  if (page === 'login') setupLogin();
  if (page === 'signup') setupSignup();
  if (page === 'logout') setupLogout();
});
