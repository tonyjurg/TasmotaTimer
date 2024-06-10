# Technical Description of the Code

The provided codebase consists of two primary files: `index.js` (running on the server side) and `index.html` (interpreted on the client side). Additionaly there are two configuration files: 

   - `config.json`: authentication details for the end user and log settings.
   - `settings.json`: authentication details for the Tasmota devices.

Together, these files create a web-based interface for using Tasmota-powered devices as a timer. The following description outlines the functionality and interactions between these files.

# index.html

The `index.html` file is a web page designed to control the timerfunction on a Tasmota devices via a simple user interface. It contains several HTML elements, JavaScript functions, and CSS references to facilitate control and status monitoring of the Tasmota timer. This part is rendered and executed at the client side, to create a GUI and define actions for its control elements. The static file index.html together with the ascociated stylesheet (index.css) are served by a call to index.js. 

<details>
<summary><b>Details on HTML Structure</b></summary>

1. **Head Section**: 
   - Sets up meta tags for character set and viewport settings.
   - Includes app title and links to an external CSS stylesheet for styling (index.css).

2. **Body Section**:
   - Formats app including its title image (header.png).
   - A `div` with the ID `controls` includes:
     - A dropdown menu for selecting a device.
     - A switch to toggle device power.
     - Inputs for setting timer duration in hours and minutes.
     - Buttons to set and clear timers.
   - A `div` with the ID `log` displays the current timer status, last user action, and error messages when aplicable.
</details>

<details>
<summary><b>Details on JavaScript functionality</b></summary>

Embedded within the HTML file, the JavaScript handles the interaction logic:

1. **Initialization and WebSocket Setup**:
   - The WebSocket connection is established with the server.
   - Functions to update the device status and handle WebSocket events are defined.

2. **Device Control Functions**:
   - `togglePower()`: Toggles the power state of the selected device and updates the status display.
   - `setTimerWithDelta()`: Sets a timer based on user input for hours and minutes and enables timers on the device.
   - `clearTimer()`: Clears any active timers on the device and updates the status display.
   - `updateDeviceStatus()`: Fetches and displays the current power and timer status of the selected device.
   - `deviceChanged()`: Updates the status display when a different device is selected.

3. **Utility Functions**:
   - `getLocalTimeString()`: Returns the current local time as a formatted string.
   - `getSelectedDevice()`: Retrieves the currently selected device from the dropdown menu.
   - `sendCommand()`: Sends commands to the server to interact with the device, handling responses and errors appropriately.

4. **Event Listeners**:
   - On page load, the list of devices is fetched from the server, and the first device is selected by default.
   - Periodic updates to device status are set to occur every minute.
</details>

# index.js

The `index.js` file implements the server-side logic using Node.js, handling HTTP requests to interact with Tasmota devices. It reads configuration settings, manages user authentication, and serves static files and API endpoints. This part is executed at the server side.

<details>
<summary><b>Server Setup and Configuration</b></summary>

1. **Dependencies and Initialization**:
   - Requires essential modules: `http`, `fs`, `path`, `crypto`, and `url`.
   - Initializes server settings like hostname, port, and debug mode.
   - Defines utility functions for password hashing, input sanitization, and authentication.

2. **Configuration File Loading**:
   - Reads and parses `config.json` and `settings.json` to load user credentials and device accounts.
</details>

<details>
<summary><b>HTTP Server</b></summary>

1. **Server Creation**:
   - Creates an HTTP server to listen for incoming requests.

2. **Request Handling**:
   - Handles different routes based on the request URL:
     - `POST /login`: Authenticates users using credentials from the request body.
     - Serves static files (`index.html`, `styles.css`, `favicon.ico`, and `header.png`).
     - `GET /devices`: Returns a list of available devices.
     - The following device-specific routes are defined (`/setPower`, `/getTime`, `/setTimer`, `/clearTimer`, `/getTimerStatus`, `/getPowerStatus`, `/enableTimers`, `/disableTimers`).

3. **Command Execution**:
   - Defines functions to handle device commands:
     - `handleSetPower()`: Sets the power state of a device.
     - `handleSetTimer()`: Sets a timer on a device.
     - `handleClearTimer()`: Clears a timer on a device.
     - `handleGetTimerStatus()`, `handleGetPowerStatus()`, `handleGetTime()`: Fetches current status information from the device.
     - `handleEnableTimers()`, `handleDisableTimers()`: Enables or disables timers on a device.

4. **Utility Functions**:
   - `isAuthorized()`: Checks if a request contains valid authentication credentials.
   - `serveStaticFile()`: Serves static files from the server's public directory.
   - `logMessage()`: Logs messages to a file if debug mode is enabled.
   - `getRequestOptions()`: Prepares HTTP request options for sending commands to Tasmota devices.
   - `makeRequest()`: Makes HTTP requests to Tasmota devices and processes responses.
   - `getCurrentDeviceTime()`: Get the current time from the Tasmota device.
   - `sanitizeInput()`: Sanitize input to prevent XSS attacks.
</details>

## Logging and Debugging

- The server logs client actions and errors to a log file if debug mode is enabled (by setting 'debug' to 'true' in config.json, providing traceability and aiding in debugging issues. Please be aware that there is no mechanism implemented to manage the logfiles. Logging is only to be switched on to allow for investigation or for development purposes.  


