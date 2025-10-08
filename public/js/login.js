const $form = document.querySelector('#login');
const $username = document.querySelector('input#username');
const $password = document.querySelector('input#password');
const $submit = document.querySelector('button#submit');
const $error = document.querySelector('#form_error');
const $errorText = document.querySelector('#form_error_text');

function setError(message) {
    $errorText.innerText = message;
    $error.classList.toggle('is-hidden', false); 
}

function getFormData() {
    let username = $username.value.trim();
    let password = $password.value.trim();
    if (username.length == 0) {
        setError("Username cannot be empty.");
        return;
    }
    return { username, password };
}

async function handleLogin() {
    const url = "/login";
    const formData = getFormData();
    if (!formData) return;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        if (response.status == 403 || response.err == 'auth') {
            setError("Invalid username or password.");
            return;
        }

        if (!response.ok) {
            setError("Sorry, there was an internal error. Please try again later.");
            return;
        }

        result = await response.json();
        return result; 
    } catch (e) {
        setError("Unexpected error sending the login request.");
        console.log(e);
    }
}

$form.addEventListener('submit', async (e) => {
    e.preventDefault();
    $submit.classList.toggle('is-loading', true); 
    $error.classList.toggle('is-hidden', true);
    const data = await handleLogin();
    console.log(data);
    $submit.classList.toggle('is-loading', false); 
});

