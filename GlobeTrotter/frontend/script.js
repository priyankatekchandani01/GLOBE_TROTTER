function showMessage(message) {
    alert(message);
}

document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("togglePassword");
    const password = document.getElementById("password");
    if (toggle && password) {
        toggle.addEventListener("click", () => {
            password.type = password.type === "password" ? "text" : "password";
            toggle.textContent = password.type === "password" ? "👁" : "🙈";
        });
    }

    const form = document.getElementById("loginForm");
    if (form) {
        form.addEventListener("submit", (e) => {
            const login = document.getElementById("login");
            const pass = document.getElementById("password");
            const loginError = document.getElementById("loginError");
            const passError = document.getElementById("passwordError");
            loginError.textContent = "";
            passError.textContent = "";
            let ok = true;

            if (!login.value.trim()) {
                loginError.textContent = "Username or email is required.";
                ok = false;
            }
            if (!pass.value) {
                passError.textContent = "Password is required.";
                ok = false;
            }
            if (!ok) e.preventDefault();
        });
    }

    const startDate = document.querySelector('input[name="start_date"]');
    const endDate = document.querySelector('input[name="end_date"]');
    if (startDate && endDate) {
        startDate.addEventListener("change", () => {
            endDate.min = startDate.value;
            if (endDate.value && endDate.value < startDate.value) endDate.value = "";
        });
    }
});
