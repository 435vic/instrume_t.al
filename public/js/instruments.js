async function handleCardButton(element) {
    const { action, forinstrument } = element.dataset;
    if (action == "delete") {
        element.classList.toggle('is-loading', true);
        await deleteInstrument(forinstrument);
        element.classList.toggle('is-loading', false);
    } else if (action == "edit") {

    }
}

// TODO: improve usability
// reload immediately upon delete, show notification on next page load instead
async function deleteInstrument(id) {
    const result = await fetch(`/api/v1/instruments/${id}`, { method: 'DELETE' });
    if (!result.ok) {
        showNotification('There was an error processing your request.', 'is-danger');
        return;
    }

    const card = document.getElementById(`instrument-cell-${id}`);
    if (!card) {
        console.error(`ERROR: instrument with id ${id} not in page!`);
        return;
    }

    card.remove();
    showNotification('Entry deleted successfully.', 'is-success');
    setTimeout(() => {
        location.reload();
    }, 860);
}

