document.addEventListener('DOMContentLoaded', async () => {
  const jobForm = document.getElementById('jobForm');
  const clearBtn = document.getElementById('clearBtn');
  const messageDiv = document.getElementById('message');
  const dateAppliedInput = document.getElementById('dateApplied');
  const companyNameInput = document.getElementById('companyName');
  const jobTitleInput = document.getElementById('jobTitle');
  const jobUrlInput = document.getElementById('jobUrl');
  const submitBtn = document.getElementById('submitBtn');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const buttonSpinner = submitBtn.querySelector('.button-spinner');
  const recentApplications = document.getElementById('recentApplications');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;
      // Update active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => {
        if (content.id === `${tabId}-tab`) {
          content.classList.add('active');
          content.style.display = 'block';
        } else {
          content.classList.remove('active');
          content.style.display = 'none';
        }
      });
      button.classList.add('active');
      // Load content based on tab
      if (tabId === 'recent') {
        loadRecentApplications();
      } else if (tabId === 'analytics') {
        loadAnalytics();
      }
    });
  });

  // Function to convert date to relative time
  function getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? 'year' : 'years'} ago`;
    }
  }

  // Load recent applications
  async function loadRecentApplications() {
    try {
      const spreadsheetId = await getSpreadsheetId();
      console.log('Spreadsheet ID:', spreadsheetId);
      
      if (!spreadsheetId) {
        recentApplications.innerHTML = '<div class="message error">Please set up your Google Spreadsheet ID in the extension options.</div>';
        return;
      }

      const token = await getAuthToken();
      console.log('Auth token received:', !!token);
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:F?majorDimension=ROWS`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch recent applications');
      }

      const data = await response.json();
      console.log('Sheet data:', data);
      
      const rows = data.values || [];
      console.log('Number of rows:', rows.length);
      
      // Skip header row and get last 5 applications
      const applications = rows.slice(1).reverse().slice(0, 5);
      console.log('Recent applications:', applications);
      
      if (applications.length === 0) {
        recentApplications.innerHTML = '<div class="message">No applications found. Have you added any applications yet?</div>';
        return;
      }

      recentApplications.innerHTML = `
        <table class="applications-table">
          <thead>
            <tr>
              <th>Job Title</th>
              <th>Company</th>
              <th>Applied</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${applications.map(app => `
              <tr>
                <td>${app[0]}</td>
                <td>${app[1]}</td>
                <td>${getRelativeTime(app[2])}</td>
                <td><span class="status-badge status-${app[3].toLowerCase()}">${app[3]}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (error) {
      recentApplications.innerHTML = `<div class="message error">Error loading applications: ${error.message}</div>`;
    }
  }

  // Load analytics data
  async function loadAnalytics() {
    const analyticsTab = document.getElementById('analytics-tab');
    analyticsTab.style.display = 'block';

    // Fetch real data from Google Sheets
    let last15Days = [];
    let hasData = false;
    try {
      const spreadsheetId = await getSpreadsheetId();
      if (spreadsheetId) {
        const token = await getAuthToken();
        const response = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:C?majorDimension=ROWS`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            }
          }
        );
        if (response.ok) {
          const data = await response.json();
          const rows = data.values || [];
          if (rows.length > 1) {
            // rows[0] is header
            const applications = rows.slice(1).map(row => ({
              date: row[2], // Assuming date is in column C
              applications: 1 // Each row is one application
            }));
            // Aggregate by date
            const dateMap = {};
            applications.forEach(app => {
              if (dateMap[app.date]) dateMap[app.date]++;
              else dateMap[app.date] = 1;
            });
            // Get last 15 days
            const today = new Date();
            last15Days = Array.from({ length: 15 }, (_, i) => {
              const d = new Date();
              d.setDate(today.getDate() - (14 - i));
              const key = d.toISOString().split('T')[0];
              return {
                date: key,
                applications: dateMap[key] || 0
              };
            });
            hasData = last15Days.some(day => day.applications > 0);
          }
        }
      }
    } catch (e) {
      // Ignore errors, fallback to no data
    }

    // Update KPIs with real or dummy data
    document.getElementById('totalApplied').textContent = hasData ? last15Days.reduce((sum, d) => sum + d.applications, 0) : '0';
    document.getElementById('totalRejected').textContent = '—';
    document.getElementById('totalInterviews').textContent = '—';
    document.getElementById('totalAccepted').textContent = '—';

    // Create histogram using vanilla JS or show no data message
    const chartContainer = document.getElementById('applicationsChart');
    chartContainer.innerHTML = '';

    if (!hasData) {
      chartContainer.innerHTML = '<div style="text-align:center;color:#888;font-size:1.1rem;padding:60px 0;">No data to display</div>';
      // Remove any existing chart title below the chart
      let chartTitle = document.querySelector('.chart-title');
      if (chartTitle) chartTitle.remove();
      chartContainer.insertAdjacentHTML('afterend', '<div class="chart-title">Applications per Day (Last 15 Days)</div>');
      document.getElementById('applicationFrequency').textContent = '';
      return;
    }

    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.id = 'applicationsHistogram';
    canvas.width = chartContainer.clientWidth;
    canvas.height = 300;
    chartContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const padding = 40;
    const gap = 6; // Gap between bars
    const barWidth = (canvas.width - padding * 2 - gap * (last15Days.length - 1)) / last15Days.length;
    const maxValue = Math.max(...last15Days.map(day => day.applications));
    const scale = (canvas.height - padding * 2) / maxValue;

    // Animation variables
    let animationProgress = 0;
    const animationDuration = 1000; // 1 second
    const startTime = performance.now();

    // Colors
    const colors = {
      bar: '#4CAF50',
      barHover: '#45a049',
      text: '#333',
      axis: '#E2E8F0',
      background: '#fff',
      tooltip: {
        background: 'rgba(255, 255, 255, 0.95)',
        border: '#E2E8F0',
        text: '#333'
      }
    };

    // Tooltip state
    let hoveredBar = null;
    let tooltipTimeout = null;

    // Draw function
    function draw() {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw bars with animation
      last15Days.forEach((day, index) => {
        const x = padding + index * (barWidth + gap);
        const targetHeight = day.applications * scale;
        const currentHeight = targetHeight * animationProgress;
        const y = canvas.height - padding - currentHeight;

        // Draw bar
        ctx.fillStyle = hoveredBar === index ? colors.barHover : colors.bar;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, currentHeight, 4);
        ctx.fill();

        // Draw date label
        ctx.fillStyle = colors.text;
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        const date = new Date(day.date);
        const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
        ctx.fillText(dateLabel, x + barWidth/2, canvas.height - padding + 15);

        // Draw value label
        if (day.applications > 0) {
          ctx.fillText(day.applications, x + barWidth/2, y - 5);
        }
      });

      // Draw axes
      ctx.beginPath();
      ctx.strokeStyle = colors.axis;
      ctx.lineWidth = 1;

      // X-axis
      ctx.moveTo(padding, canvas.height - padding);
      ctx.lineTo(canvas.width - padding, canvas.height - padding);
      
      // Y-axis
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, canvas.height - padding);
      ctx.stroke();

      // Draw y-axis labels
      ctx.fillStyle = colors.text;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      for (let i = 0; i <= maxValue; i += Math.ceil(maxValue/5)) {
        const y = canvas.height - padding - (i * scale);
        ctx.fillText(i, padding - 5, y + 3);
      }

      // Draw y-axis label (rotated)
      ctx.save();
      ctx.translate(padding - 32, canvas.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = '13px Inter, sans-serif';
      ctx.fillStyle = '#888';
      ctx.textAlign = 'center';
      ctx.fillText('No. of applications', 0, 0);
      ctx.restore();

      // Draw x-axis label
      ctx.font = '13px Inter, sans-serif';
      ctx.fillStyle = '#888';
      ctx.textAlign = 'center';
      ctx.fillText('Dates', canvas.width / 2, canvas.height - padding + 38);

      // Draw tooltip if hovering
      if (hoveredBar !== null) {
        const day = last15Days[hoveredBar];
        const x = padding + hoveredBar * (barWidth + gap);
        const height = day.applications * scale * animationProgress;
        const y = canvas.height - padding - height;

        // Tooltip content
        const tooltipText = [
          `${day.applications} application${day.applications !== 1 ? 's' : ''}`,
          new Date(day.date).toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'short',
            day: 'numeric'
          })
        ];

        // Calculate tooltip dimensions
        ctx.font = '12px Inter, sans-serif';
        const tooltipWidth = Math.max(...tooltipText.map(text => ctx.measureText(text).width)) + 20;
        const tooltipHeight = tooltipText.length * 20 + 10;
        const tooltipX = Math.min(Math.max(x + barWidth/2 - tooltipWidth/2, padding), canvas.width - padding - tooltipWidth);
        const tooltipY = y - tooltipHeight - 10;

        // Draw tooltip background
        ctx.fillStyle = colors.tooltip.background;
        ctx.strokeStyle = colors.tooltip.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 6);
        ctx.fill();
        ctx.stroke();

        // Draw tooltip text
        ctx.fillStyle = colors.tooltip.text;
        ctx.textAlign = 'center';
        tooltipText.forEach((text, i) => {
          ctx.fillText(text, tooltipX + tooltipWidth/2, tooltipY + 20 + i * 20);
        });
      }
    }

    // Animation loop
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      animationProgress = Math.min(elapsed / animationDuration, 1);
      
      draw();
      
      if (animationProgress < 1) {
        requestAnimationFrame(animate);
      }
    }

    // Start animation
    requestAnimationFrame(animate);

    // Add interactivity
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check if mouse is over a bar
      const barIndex = Math.floor((x - padding) / (barWidth + gap));
      if (barIndex >= 0 && barIndex < last15Days.length) {
        const barX = padding + barIndex * (barWidth + gap);
        const barHeight = last15Days[barIndex].applications * scale * animationProgress;
        const barY = canvas.height - padding - barHeight;

        if (x >= barX && x <= barX + barWidth && y >= barY && y <= canvas.height - padding) {
          if (hoveredBar !== barIndex) {
            hoveredBar = barIndex;
            canvas.style.cursor = 'pointer';
            draw();
          }
        } else if (hoveredBar !== null) {
          hoveredBar = null;
          canvas.style.cursor = 'default';
          draw();
        }
      } else if (hoveredBar !== null) {
        hoveredBar = null;
        canvas.style.cursor = 'default';
        draw();
      }
    });

    canvas.addEventListener('mouseleave', () => {
      if (hoveredBar !== null) {
        hoveredBar = null;
        canvas.style.cursor = 'default';
        draw();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      canvas.width = chartContainer.clientWidth;
      draw();
    });

    // Update insights
    const totalApplications = last15Days.reduce((sum, day) => sum + day.applications, 0);
    const avgApplications = totalApplications / last15Days.length;
    document.getElementById('applicationFrequency').textContent = 
      `You're applying to an average of ${avgApplications.toFixed(1)} jobs per day. Keep up the momentum!`;

    // Remove any existing chart title below the chart
    let chartTitle = document.querySelector('.chart-title');
    if (chartTitle) chartTitle.remove();
    chartContainer.insertAdjacentHTML('afterend', '<div class="chart-title">Applications per Day (Last 15 Days)</div>');
  }

  // Set default date to today
  dateAppliedInput.valueAsDate = new Date();

  // Show loading state
  function showLoading() {
    loadingOverlay.classList.add('active');
    buttonSpinner.classList.add('active');
    submitBtn.disabled = true;
  }

  // Hide loading state
  function hideLoading() {
    loadingOverlay.classList.remove('active');
    buttonSpinner.classList.remove('active');
    submitBtn.disabled = false;
  }

  // Auto-fill job info and URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Set the current URL
    jobUrlInput.value = tab.url;

    // Try to get job info from the page
    chrome.tabs.sendMessage(tab.id, { action: "extractJobInfo" }, (response) => {
      if (response) {
        if (response.companyName) {
          companyNameInput.value = response.companyName;
        }
        if (response.jobTitle) {
          jobTitleInput.value = response.jobTitle;
        }
      }
    });
  } catch (error) {
    console.error('Error auto-filling data:', error);
  }

  // Handle form submission
  jobForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    
    try {
      const spreadsheetId = await getSpreadsheetId();
      if (!spreadsheetId) {
        showMessage('Please set up your Google Spreadsheet ID in the extension options.', 'error');
        hideLoading();
        return;
      }

      const formData = {
        jobTitle: jobTitleInput.value,
        companyName: companyNameInput.value,
        dateApplied: dateAppliedInput.value,
        status: document.getElementById('status').value,
        jobUrl: jobUrlInput.value,
        notes: document.getElementById('notes').value
      };

      await saveToGoogleSheets(spreadsheetId, formData);
      showMessage('Application saved successfully!', 'success');
      
      // Clear form and close popup after a short delay
      setTimeout(() => {
        jobForm.reset();
        dateAppliedInput.valueAsDate = new Date();
        window.close();
      }, 1500);
    } catch (error) {
      showMessage('Error saving application: ' + error.message, 'error');
      hideLoading();
    }
  });

  // Handle clear button
  clearBtn.addEventListener('click', () => {
    jobForm.reset();
    dateAppliedInput.valueAsDate = new Date();
  });

  // Get spreadsheet ID from storage
  function getSpreadsheetId() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['spreadsheetId'], (result) => {
        resolve(result.spreadsheetId);
      });
    });
  }

  // Save data to Google Sheets
  async function saveToGoogleSheets(spreadsheetId, data) {
    const token = await getAuthToken();
    
    const values = [
      [
        data.jobTitle,
        data.companyName,
        data.dateApplied,
        data.status,
        data.jobUrl,
        data.notes
      ]
    ];

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:F:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: values
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to save to Google Sheets');
    }
  }

  // Get OAuth token
  function getAuthToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(token);
        }
      });
    });
  }

  // Show message to user
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    setTimeout(() => {
      messageDiv.className = 'message';
    }, 3000);
  }

  // Handle 'View Your Google Sheet' button
  const viewSheetBtn = document.getElementById('viewSheetBtn');
  if (viewSheetBtn) {
    viewSheetBtn.addEventListener('click', async () => {
      const spreadsheetId = await getSpreadsheetId();
      if (spreadsheetId) {
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
        window.open(url, '_blank');
      } else {
        showMessage('Please set up your Google Spreadsheet ID in the extension options.', 'error');
      }
    });
  }
}); 