document.addEventListener('DOMContentLoaded', () => {
  const optionsForm = document.getElementById('optionsForm');
  const spreadsheetIdInput = document.getElementById('spreadsheetId');
  const messageDiv = document.getElementById('message');

  // Load saved spreadsheet ID
  chrome.storage.sync.get(['spreadsheetId'], (result) => {
    if (result.spreadsheetId) {
      spreadsheetIdInput.value = result.spreadsheetId;
    }
  });

  // Save spreadsheet ID
  optionsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const spreadsheetId = spreadsheetIdInput.value.trim();

    chrome.storage.sync.set({ spreadsheetId }, () => {
      showMessage('Settings saved successfully!', 'success');
    });
  });

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    setTimeout(() => {
      messageDiv.className = 'message';
    }, 3000);
  }
}); 