// Constants
const SHEET_ID = '1V-s_8B6ChxZAiNW1C9wmZtccJHj7It2G';
const SHEET_NAME = 'Sheet1'; // Assuming the sheet name is Sheet1
const SHEET_RANGE = 'A:C'; // Assuming columns A, B, C contain plot_id, plot_name, svg_code
const REFRESH_INTERVAL = 5000; // Refresh data every 5 seconds for more responsive updates

// DOM Elements
const plotGrid = document.getElementById('plotGrid');
const mapContainer = document.getElementById('mapContainer');
const svgContainer = document.getElementById('svgContainer');
const scaleIndicator = document.getElementById('scaleIndicator');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const resetZoomBtn = document.getElementById('resetZoom');

// State
let currentSelectedPlot = null;
let plotData = [];
let currentZoom = 1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;
let refreshTimer = null;
let lastDataHash = ''; // To track if data has changed

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    fetchDataFromGoogleSheet();
    initializeZoomControls();
    
    // Set up periodic refresh
    refreshTimer = setInterval(fetchDataFromGoogleSheet, REFRESH_INTERVAL);
});

// Initialize zoom controls
function initializeZoomControls() {
    // Zoom in button
    zoomInBtn.addEventListener('click', () => {
        if (currentZoom < MAX_ZOOM) {
            currentZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
            applyZoom();
        }
    });

    // Zoom out button
    zoomOutBtn.addEventListener('click', () => {
        if (currentZoom > MIN_ZOOM) {
            currentZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
            applyZoom();
        }
    });

    // Reset zoom button
    resetZoomBtn.addEventListener('click', () => {
        currentZoom = 1;
        applyZoom();
    });

    // Mouse wheel zoom
    svgContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        // Get mouse position relative to the container
        const rect = svgContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Store scroll position before zoom
        const scrollLeft = svgContainer.scrollLeft;
        const scrollTop = svgContainer.scrollTop;
        
        // Calculate position under mouse before zoom
        const mouseXBeforeZoom = scrollLeft + mouseX;
        const mouseYBeforeZoom = scrollTop + mouseY;
        
        // Apply zoom
        const oldZoom = currentZoom;
        
        if (e.deltaY < 0) {
            // Zoom in
            if (currentZoom < MAX_ZOOM) {
                currentZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
            }
        } else {
            // Zoom out
            if (currentZoom > MIN_ZOOM) {
                currentZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
            }
        }
        
        // Only proceed if zoom actually changed
        if (oldZoom !== currentZoom) {
            applyZoom();
            
            // Calculate position under mouse after zoom
            const zoomRatio = currentZoom / oldZoom;
            const mouseXAfterZoom = mouseXBeforeZoom * zoomRatio;
            const mouseYAfterZoom = mouseYBeforeZoom * zoomRatio;
            
            // Adjust scroll position to keep mouse over same point
            svgContainer.scrollLeft = mouseXAfterZoom - mouseX;
            svgContainer.scrollTop = mouseYAfterZoom - mouseY;
        }
    });
}

// Apply zoom transformation
function applyZoom() {
    const mapContent = document.getElementById('mapContent');
    if (mapContent) {
        mapContent.style.transform = `scale(${currentZoom})`;
        mapContent.style.transformOrigin = 'top left';
    }
    updateScaleIndicator();
}

// Update scale indicator
function updateScaleIndicator() {
    const percentage = Math.round(currentZoom * 100);
    scaleIndicator.textContent = `Tỷ lệ: ${percentage}%`;
}

// Simple hash function for data comparison
function hashData(data) {
    return JSON.stringify(data);
}

// Fetch data from Google Sheet
async function fetchDataFromGoogleSheet() {
    try {
        // Add a cache-busting parameter to prevent caching
        const cacheBuster = new Date().getTime();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}!${SHEET_RANGE}?key=AIzaSyBNlYH01_9Hc5S1J9vuFmu2nUqBZJNAXxs&_=${cacheBuster}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch data from Google Sheet');
        }
        
        const data = await response.json();
        
        // Check if data has changed
        const newDataHash = hashData(data.values);
        if (newDataHash !== lastDataHash) {
            lastDataHash = newDataHash;
            processSheetData(data.values);
            console.log('Data updated from Google Sheet');
        } else {
            console.log('No changes detected in Google Sheet data');
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        // For demo purposes, use sample data if fetch fails
        if (plotData.length === 0) {
            useSampleData();
        }
    }
}

// Process data from Google Sheet
function processSheetData(values) {
    if (!values || values.length <= 1) {
        console.error('No data found in the sheet');
        useSampleData();
        return;
    }
    
    // Skip header row
    const headers = values[0];
    const rows = values.slice(1);
    
    // Save current selected plot ID if any
    const previousSelectedPlotId = currentSelectedPlot;
    
    plotData = rows.map(row => {
        return {
            plot_id: row[0] || '',
            plot_name: row[1] || '',
            svg_code: row[2] || ''
        };
    });
    
    renderPlotButtons();
    renderSVGMap();
    
    // Reselect the previously selected plot if it still exists
    if (previousSelectedPlotId) {
        const plotStillExists = plotData.some(plot => plot.plot_id === previousSelectedPlotId);
        if (plotStillExists) {
            selectPlot(previousSelectedPlotId);
        }
    }
}

// Use sample data for testing or when fetch fails
function useSampleData() {
    plotData = [
        { 
            plot_id: '1', 
            plot_name: 'Lô 01', 
            svg_code: '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 496.34 94.98"><defs><style>.cls-1{fill:#ed1c24;}</style></defs><rect class="cls-1" width="94.98" height="94.98"/></svg>' 
        },
        { 
            plot_id: '2', 
            plot_name: 'Lô 02', 
            svg_code: '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 496.34 94.98"><defs><style>.cls-2{fill:#00a651;}</style></defs><rect class="cls-2" x="100.34" width="94.98" height="94.98"/></svg>' 
        },
        { 
            plot_id: '3', 
            plot_name: 'Lô 03', 
            svg_code: '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 496.34 94.98"><defs><style>.cls-3{fill:#00aeef;}</style></defs><rect class="cls-3" x="200.68" width="94.98" height="94.98"/></svg>' 
        }
    ];
    
    renderPlotButtons();
    renderSVGMap();
}

// Render plot buttons in grid layout
function renderPlotButtons() {
    plotGrid.innerHTML = '';
    
    plotData.forEach(plot => {
        const button = document.createElement('button');
        button.className = 'plot-button';
        button.dataset.plotId = plot.plot_id;
        button.textContent = plot.plot_name;
        
        button.addEventListener('click', () => {
            selectPlot(plot.plot_id);
        });
        
        plotGrid.appendChild(button);
    });
}

// Render SVG map
function renderSVGMap() {
    // Remember scroll position
    const scrollLeft = svgContainer.scrollLeft;
    const scrollTop = svgContainer.scrollTop;
    
    // Create a container SVG with a wider viewBox to accommodate all plots
    let svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
            <g id="mapContent">
    `;
    
    // Process and add each SVG directly
    plotData.forEach(plot => {
        try {
            // Create a temporary div to parse the SVG
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = plot.svg_code.trim();
            
            // Get the SVG element
            const svg = tempDiv.querySelector('svg');
            
            if (svg) {
                // Extract the defs section with styles
                const defs = svg.querySelector('defs');
                const defsContent = defs ? defs.outerHTML : '';
                
                // Extract the rect element
                const rect = svg.querySelector('rect');
                
                if (rect) {
                    // Get all attributes from the rect
                    const rectAttributes = Array.from(rect.attributes)
                        .map(attr => `${attr.name}="${attr.value}"`)
                        .join(' ');
                    
                    // Add the SVG content with proper ID for selection
                    svgContent += `
                        ${defsContent}
                        <rect id="${plot.plot_id}" ${rectAttributes}></rect>
                    `;
                } else {
                    console.error('No rect element found in SVG for plot:', plot.plot_id);
                }
            } else {
                console.error('Invalid SVG for plot:', plot.plot_id);
            }
        } catch (error) {
            console.error('Error processing SVG for plot:', plot.plot_id, error);
        }
    });
    
    // Close SVG tags
    svgContent += `
            </g>
        </svg>
    `;
    
    // Insert SVG into container
    svgContainer.innerHTML = svgContent;
    
    // Add click event listeners to SVG elements
    plotData.forEach(plot => {
        const svgElement = document.getElementById(plot.plot_id);
        if (svgElement) {
            svgElement.addEventListener('click', () => {
                selectPlot(plot.plot_id);
            });
        }
    });
    
    // Restore scroll position
    svgContainer.scrollLeft = scrollLeft;
    svgContainer.scrollTop = scrollTop;
    
    // Reapply zoom if it was set
    if (currentZoom !== 1) {
        applyZoom();
    }
}

// Select and highlight a plot
function selectPlot(plotId) {
    // Remove highlight from previously selected plot
    if (currentSelectedPlot) {
        const prevElement = document.getElementById(currentSelectedPlot);
        if (prevElement) {
            prevElement.classList.remove('plot-highlight');
        }
        
        // Remove active class from buttons
        const buttons = document.querySelectorAll('.plot-button');
        buttons.forEach(btn => btn.classList.remove('active'));
    }
    
    // Highlight new selected plot
    const svgElement = document.getElementById(plotId);
    if (svgElement) {
        svgElement.classList.add('plot-highlight');
        currentSelectedPlot = plotId;
        
        // Add active class to corresponding button
        const button = document.querySelector(`.plot-button[data-plot-id="${plotId}"]`);
        if (button) {
            button.classList.add('active');
        }
        
        // Scroll to map section
        const mapSection = document.querySelector('.map-section');
        mapSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Function to handle errors with Google Sheets API
function handleAPIError() {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.textContent = 'Unable to load data from Google Sheet. Using sample data instead.';
    document.querySelector('.container').prepend(errorMessage);
    
    // Use sample data as fallback
    useSampleData();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
});
