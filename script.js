// Constants
const REFRESH_INTERVAL = 5000; // Refresh data every 5 seconds
const GOOGLE_SHEET_PROXY_URL = "https://script.google.com/macros/s/AKfycbwizUYzvyI_on7b7zqOUmIPVUMBpL4zuiJ09-FAKLfWOJdEZUHXWFLTi-TEsSZEjZeIZQ/exec";

// DOM Elements
const plotGrid = document.getElementById('plotGrid');
const mapContainer = document.getElementById('mapContainer');
const svgContainer = document.getElementById('svgContainer');
const scaleIndicator = document.getElementById('scaleIndicator');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const resetZoomBtn = document.getElementById('resetZoom');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');

// State
let currentSelectedPlot = null;
let plotData = [];
let currentZoom = 1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.2;
let refreshTimer = null;
let isRefreshing = false;
let isEditMode = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('Application initialized');
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize zoom controls
    initializeZoomControls();
      
    // Fetch data from Google Sheet immediately
    fetchDataFromGoogleSheet();
    
    // Set up automatic refresh
    refreshTimer = setInterval(fetchDataFromGoogleSheet, REFRESH_INTERVAL);
});

// Set up event listeners
function setupEventListeners() {
    // Modal close button
    document.querySelector('.close-modal').addEventListener('click', closeModal);
    
    // Cancel edit button
    document.getElementById('cancelEdit').addEventListener('click', closeModal);
    
    // Edit form submit
    editForm.addEventListener('submit', handleEditFormSubmit);
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === editModal) {
            closeModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // Escape key to close modal
        if (event.key === 'Escape') {
            closeModal();
        }
        
        // Ctrl+R or Cmd+R for manual refresh
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            console.log('Manual refresh triggered via keyboard');
            fetchDataFromGoogleSheet();
        }
    });
}

// Update row count display
function updateRowCountDisplay(count) {
    const display = document.getElementById('rowCountDisplay');
    if (display) {
        display.textContent = `Số lô: ${count}`;
    }
}

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

// Fetch data from Google Sheet
function fetchDataFromGoogleSheet() {
    if (isRefreshing) return;
    
    isRefreshing = true;
    console.log('Fetching data from Google Sheet...');
    
    // Add cache-busting parameter to prevent caching
    const url = `${GOOGLE_SHEET_PROXY_URL}?timestamp=${new Date().getTime()}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Data received from Google Sheet:', data);
            
            if (Array.isArray(data) && data.length > 0) {
                // Check if data has changed
                const dataChanged = JSON.stringify(data) !== JSON.stringify(plotData);
                
                if (dataChanged) {
                    plotData = data;
                    updateRowCountDisplay(plotData.length);
                    renderPlotButtons();
                    generateSVGMap();
                    console.log('UI updated with new data');
                } else {
                    console.log('No changes in data, skipping UI update');
                }
            } else {
                console.warn('No valid data received from Google Sheet');
            }
        })
        .catch(error => {
            console.error('Error fetching data from Google Sheet:', error);
        })
        .finally(() => {
            isRefreshing = false;
        });
}

// Toggle edit mode
function toggleEditMode() {
    isEditMode = !isEditMode;
    
    if (isEditMode) {
        document.body.classList.add('edit-mode');
    } else {
        document.body.classList.remove('edit-mode');
    }
    
    // Re-render to add or remove edit buttons
    renderPlotButtons();
    generateSVGMap();
}

// Open edit modal for a plot
function openEditModal(plotId) {
    const plot = plotData.find(p => p.plot_id === plotId);
    if (!plot) return;
    
    // Parse SVG to get properties
    const svgData = parseSvgCode(plot.svg_code);
    
    // Fill form fields
    document.getElementById('editPlotId').value = plot.plot_id;
    document.getElementById('editPlotName').value = plot.plot_name;
    document.getElementById('editPlotColor').value = svgData.fillColor;
    document.getElementById('editPlotX').value = svgData.x;
    document.getElementById('editPlotY').value = svgData.y;
    document.getElementById('editPlotWidth').value = svgData.width;
    document.getElementById('editPlotHeight').value = svgData.height;
    document.getElementById('editSvgCode').value = plot.svg_code;
    
    // Show modal
    editModal.style.display = 'block';
}

// Close edit modal
function closeModal() {
    editModal.style.display = 'none';
}

// Handle edit form submit
function handleEditFormSubmit(event) {
    event.preventDefault();
    
    const plotId = document.getElementById('editPlotId').value;
    const plotName = document.getElementById('editPlotName').value;
    const plotColor = document.getElementById('editPlotColor').value;
    const plotX = parseFloat(document.getElementById('editPlotX').value);
    const plotY = parseFloat(document.getElementById('editPlotY').value);
    const plotWidth = parseFloat(document.getElementById('editPlotWidth').value);
    const plotHeight = parseFloat(document.getElementById('editPlotHeight').value);
    
    // Find the plot to edit
    const plotIndex = plotData.findIndex(p => p.plot_id === plotId);
    if (plotIndex === -1) return;
    
    // Update plot name
    plotData[plotIndex].plot_name = plotName;
    
    // Generate new SVG code
    plotData[plotIndex].svg_code = `<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 496.34 94.98"><defs><style>.cls-${plotId}{fill:${plotColor};}</style></defs><rect class="cls-${plotId}" x="${plotX}" y="${plotY}" width="${plotWidth}" height="${plotHeight}"/></svg>`;
    
    // Update UI
    renderPlotButtons();
    generateSVGMap();
    
    // Close modal
    closeModal();
    
    // Select the edited plot
    selectPlot(plotId);
}

// Parse SVG code to extract style and geometry information
function parseSvgCode(svgCode) {
    try {
        // Create a temporary div to parse the SVG
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svgCode.trim();
        
        // Get the SVG element
        const svg = tempDiv.querySelector('svg');
        if (!svg) {
            throw new Error('No SVG element found');
        }
        
        // Get the viewBox
        const viewBox = svg.getAttribute('viewBox') || '0 0 496.34 94.98';
        
        // Get the rect element
        const rect = svg.querySelector('rect');
        if (!rect) {
            throw new Error('No rect element found');
        }
        
        // Get rect attributes
        const x = rect.getAttribute('x') || '0';
        const y = rect.getAttribute('y') || '0';
        const width = rect.getAttribute('width') || '94.98';
        const height = rect.getAttribute('height') || '94.98';
        
        // Get style information
        let fillColor = '#cccccc'; // Default gray
        
        // Try to get fill color from rect directly
        if (rect.getAttribute('fill')) {
            fillColor = rect.getAttribute('fill');
        } 
        // Try to get fill color from class
        else if (rect.getAttribute('class')) {
            const className = rect.getAttribute('class');
            const styleTag = svg.querySelector('style');
            if (styleTag) {
                const styleText = styleTag.textContent;
                const fillMatch = styleText.match(new RegExp(`\\.${className}\\s*{[^}]*fill\\s*:\\s*(#[0-9a-fA-F]{3,6}|rgb\\([^)]+\\)|[a-zA-Z]+)`));
                if (fillMatch) {
                    fillColor = fillMatch[1];
                }
            }
        }
        // Try to extract from style definitions
        else {
            const defs = svg.querySelector('defs');
            if (defs) {
                const styles = defs.querySelectorAll('style');
                for (const style of styles) {
                    const styleText = style.textContent;
                    const fillMatch = styleText.match(/\.cls-\d+\s*{\s*fill\s*:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|[a-zA-Z]+)/);
                    if (fillMatch) {
                        fillColor = fillMatch[1];
                        break;
                    }
                }
            }
        }
        
        return {
            viewBox,
            x: parseFloat(x),
            y: parseFloat(y),
            width: parseFloat(width),
            height: parseFloat(height),
            fillColor
        };
    } catch (error) {
        console.error('Error parsing SVG code:', error);
        // Return default values
        return {
            viewBox: '0 0 496.34 94.98',
            x: 0,
            y: 0,
            width: 94.98,
            height: 94.98,
            fillColor: '#cccccc'
        };
    }
}

// Render plot buttons in grid layout
function renderPlotButtons() {
    // Clear existing buttons
    plotGrid.innerHTML = '';
    
    // Check if we have data
    if (!plotData || plotData.length === 0) {
        console.warn('No plot data available to render buttons');
        return;
    }
    
    console.log(`Rendering ${plotData.length} plot buttons`);
    
    plotData.forEach(plot => {
        const button = document.createElement('button');
        button.className = 'plot-button';
        button.dataset.plotId = plot.plot_id;
        button.textContent = plot.plot_name;
        
        // Parse SVG to get color
        const parsedSvg = parseSvgCode(plot.svg_code);
        
        // Set button border color to match plot color
        if (parsedSvg && parsedSvg.fillColor) {
            button.style.borderColor = parsedSvg.fillColor;
        }
        
        button.addEventListener('click', () => {
            if (isEditMode) {
                openEditModal(plot.plot_id);
            } else {
                selectPlot(plot.plot_id);
            }
        });
        
        // Add edit button in edit mode
        if (isEditMode) {
            const editBtn = document.createElement('span');
            editBtn.className = 'edit-btn';
            editBtn.innerHTML = '✎';
            editBtn.title = 'Chỉnh sửa lô đất';
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent button click
                openEditModal(plot.plot_id);
            });
            button.appendChild(editBtn);
        }
        
        plotGrid.appendChild(button);
    });
}

// Generate SVG map dynamically from plot data
function generateSVGMap() {
    // Remember scroll position
    const scrollLeft = svgContainer.scrollLeft;
    const scrollTop = svgContainer.scrollTop;
    
    // Check if we have data
    if (!plotData || plotData.length === 0) {
        console.warn('No plot data available to generate SVG map');
        svgContainer.innerHTML = '<div class="error-message">No plot data available</div>';
        return;
    }
    
    console.log(`Generating SVG map with ${plotData.length} plots`);
    
    // Parse SVG data for all plots
    const parsedPlots = plotData.map(plot => ({
        ...plot,
        svg_data: parseSvgCode(plot.svg_code)
    }));
    
    // Create a container SVG with a viewBox that accommodates all plots
    let maxX = 0;
    let maxY = 0;
    
    // Calculate the maximum dimensions needed
    parsedPlots.forEach(plot => {
        if (plot.svg_data) {
            const rightEdge = plot.svg_data.x + plot.svg_data.width;
            const bottomEdge = plot.svg_data.y + plot.svg_data.height;
            maxX = Math.max(maxX, rightEdge);
            maxY = Math.max(maxY, bottomEdge);
        }
    });
    
    // Add some padding
    maxX += 50;
    maxY += 50;
    
    // Create the SVG content
    let svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maxX} ${maxY}" preserveAspectRatio="xMidYMid meet">
            <g id="mapContent">
    `;
    
    // Add each plot as a rectangle
    parsedPlots.forEach(plot => {
        if (plot.svg_data) {
            svgContent += `
                <rect 
                    id="${plot.plot_id}" 
                    x="${plot.svg_data.x}" 
                    y="${plot.svg_data.y}" 
                    width="${plot.svg_data.width}" 
                    height="${plot.svg_data.height}" 
                    fill="${plot.svg_data.fillColor}" 
                    stroke="#000" 
                    stroke-width="1"
                    class="plot-rect"
                    data-plot-id="${plot.plot_id}"
                    data-plot-name="${plot.plot_name}"
                ></rect>
            `;
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
    parsedPlots.forEach(plot => {
        const svgElement = document.getElementById(plot.plot_id);
        if (svgElement) {
            svgElement.addEventListener('click', () => {
                if (isEditMode) {
                    openEditModal(plot.plot_id);
                } else {
                    selectPlot(plot.plot_id);
                }
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

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
});
