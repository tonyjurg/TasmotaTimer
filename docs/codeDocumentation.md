# Technical Description of the Code

The provided codebase consists of two primary files: `index.js` (running on the server side) and `index.html` (interpreted on the client side). Additionaly there are two configuration files: 

   - `config.json`: authentication details for the end user and log settings.
   - `settings.json`: authentication details for the Tasmota devices.

Together, these files create a web-based interface for using Tasmota-powered devices as a timer. The following description outlines the functionality and interactions between these files.

# index.html

The `index.html` file is a web page designed to control the timerfunction on a Tasmota devices via a simple user interface. It contains several HTML elements, JavaScript functions, and CSS references to facilitate control and status monitoring of the Tasmota timer. This part is rendered and executed at the client side, to create a GUI and define actions for its control elements. The static file index.html together with the ascociated stylesheet (`index.css`) are served by a call to index.js. 

<details>
<summary><b>Details on HTML Structure</b></summary>

<b>Head Section:</b>
   <ul><li>Sets up meta tags for character set and viewport settings.
   </li><li>Includes app title and links to an external CSS stylesheet for styling (`index.css`).
   </li></ul> 
   
<b>Body Section:</b>
   <ul><li>Formats app including its title image (header.png).
   </li><li>A `div` with the ID `controls` including a dropdown menu for selecting a device, a switch to toggle device power, Inputs for setting timer duration in hours and minutes and Buttons to set and clear timers.
   </li><li>A `div` with the ID `log` displays the current timer status, last user action, and error messages when aplicable.
     </li></ul> 
</details>

<details>
<summary><b>Details on JavaScript functionality</b></summary>

Embedded within the HTML file, the JavaScript handles the interaction logic:

<b>Initialization and WebSocket Setup:</b>
   <ul><li>The WebSocket connection is established with the server.
   </li><li>Functions to update the device status and handle WebSocket events are defined.
   </li></ul> 
   
<b>Device Control Functions:</b>
   <ul><li>`togglePower()`: Toggles the power state of the selected device and updates the status display.
   </li><li>`setTimerWithDelta()`: Sets a timer based on user input for hours and minutes and enables timers on the device.
   </li><li>`clearTimer()`: Clears any active timers on the device and updates the status display.
   </li><li>`updateDeviceStatus()`: Fetches and displays the current power and timer status of the selected device.
   </li><li>`deviceChanged()`: Updates the status display when a different device is selected.
   </li></ul> 

<b>Utility Functions:</b>
   <ul><li>`getLocalTimeString()`: Returns the current local time as a formatted string.
   </li><li>`getSelectedDevice()`: Retrieves the currently selected device from the dropdown menu.
   </li><li>`sendCommand()`: Sends commands to the server to interact with the device, handling responses and errors appropriately.
   </li></ul> 

<b>Event Listeners:</b>
   <ul><li>On page load, the list of devices is fetched from the server, and the first device is selected by default.
   </li><li>Periodic updates to device status are set to occur every minute.
   </li></ul> 
</details>

# index.js

The `index.js` file implements the server-side logic using Node.js, handling HTTP requests to interact with Tasmota devices. It reads configuration settings, manages user authentication, and serves static files and API endpoints. This part is executed at the server side.

<details>
<summary><b>Server Setup and Configuration</b></summary>

<b>Dependencies and Initialization:</b>
   <ul><li>Requires essential modules: `http`, `fs`, `path`, `crypto`, and `url`.
   </li><li>Initializes server settings like hostname, port, and debug mode.
   </li><li>Defines utility functions for password hashing, input sanitization, and authentication.
   </li></ul>

<b>Configuration File Loading:</b>
Reads and parses `config.json` and `settings.json` to load user credentials and device accounts.
</details>

<details>
<summary><b>HTTP Server</b></summary>

<b>Server Creation:</b>
Creates an HTTP server to listen for incoming requests.

<b>Request Handling:</b>
Handles different routes based on the request URL:
     <ul><li>`POST /login`: Authenticates users using credentials from the request body.
     </li><li>Serves static files (`index.html`, `styles.css`, `favicon.ico`, and `header.png`).
     </li><li>`GET /devices`: Returns a list of available devices.
     </li><li>The following device-specific routes are defined (`/setPower`, `/getTime`, `/setTimer`, `/clearTimer`, `/getTimerStatus`, `/getPowerStatus`, `/enableTimers`, `/disableTimers`).
     </li></ul>

<b>Command Execution:</b>
 Defines functions to handle device commands:
     <ul><li>`handleSetPower()`: Sets the power state of a device.
     </li><li>`handleSetTimer()`: Sets a timer on a device.
     </li><li>`handleClearTimer()`: Clears a timer on a device.
     </li><li>`handleGetTimerStatus()`, `handleGetPowerStatus()`, `handleGetTime()`: Fetches current status information from the device.
     </li><li>`handleEnableTimers()`, `handleDisableTimers()`: Enables or disables timers on a device.
     </li></ul>

<b>Utility Functions:</b>
   <ul><li>`isAuthorized()`: Checks if a request contains valid authentication credentials.
   </li><li>`serveStaticFile()`: Serves static files from the server's public directory.
   </li><li>`logMessage()`: Logs messages to a file if debug mode is enabled.
   </li><li>`getRequestOptions()`: Prepares HTTP request options for sending commands to Tasmota devices.
   </li><li>`makeRequest()`: Makes HTTP requests to Tasmota devices and processes responses.
   </li><li>`getCurrentDeviceTime()`: Get the current time from the Tasmota device.
   </li><li>`sanitizeInput()`: Sanitize input to prevent XSS attacks.
   </li></ul>
</details>

## Logging and Debugging

The server logs client actions and errors to a log file if debug mode is enabled (by setting 'debug' to 'true' in `config.json`, providing traceability and aiding in debugging issues. Please be aware that there is no mechanism implemented to manage the logfiles. Logging is only to be switched on to allow for investigation or for development purposes.  


