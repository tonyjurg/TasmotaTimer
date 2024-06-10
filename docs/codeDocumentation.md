# Technical Description of the Code

The provided codebase consists of two primary files: `index.js` (running on the server side) and `index.html` (interpreted on the client side). Additionaly there are two configuration files: 

   - `config.json`: authentication details for the end user and log settings.
   - `settings.json`: authentication details for the Tasmota devices.

Together, these files create a web-based interface for using Tasmota-powered devices as a timer. The following description outlines the functionality and interactions between these files.

# index.html

The `index.html` file is a web page designed to control the timerfunction on a Tasmota devices via a simple user interface. It contains several HTML elements, JavaScript functions, and CSS references to facilitate control and status monitoring of the Tasmota timer. This part is rendered and executed at the client side, to create a GUI and define actions for its control elements. The static file index.html together with the ascociated stylesheet (`index.css`) are served by a call to index.js. 

<details>
<summary><b>Details on HTML Structure</b></summary>

<br><b>Head Section:</b><br>
   <ul><li>Sets up meta tags for character set and viewport settings.
   </li><li>Includes app title and links to an external CSS stylesheet for styling (<code>index.css</code>).
   </li></ul> 
   
<b>Body Section:</b>
   <ul><li>Formats app including its title image (header.png).
   </li><li>A <code>div</code> with the ID <code>controls</code> including a dropdown menu for selecting a device, a switch to toggle device power, Inputs for setting timer duration in hours and minutes and Buttons to set and clear timers.
   </li><li>A <code>div</code> with the ID <code>log</code> displays the current timer status, last user action, and error messages when aplicable.
     </li></ul> 
</details>

<details>
<summary><b>Details on JavaScript functionality</b></summary>
<br>Embedded within the HTML file, the JavaScript handles the interaction logic:
   
<br><b>Initialization and WebSocket Setup:</b>
   <ul><li>The WebSocket connection is established with the server.
   </li><li>Functions to update the device status and handle WebSocket events are defined.
   </li></ul> 
   
<b>Device Control Functions:</b>
   <ul><li><code>togglePower()</code>: Toggles the power state of the selected device and updates the status display.
   </li><li><code>setTimerWithDelta()</code>: Sets a timer based on user input for hours and minutes and enables timers on the device.
   </li><li><code>clearTimer()</code>: Clears any active timers on the device and updates the status display.
   </li><li><code>updateDeviceStatus()</code>: Fetches and displays the current power and timer status of the selected device.
   </li><li><code>deviceChanged()</code>: Updates the status display when a different device is selected.
   </li></ul> 

<b>Utility Functions:</b>
   <ul><li><code>getLocalTimeString()</code>: Returns the current local time as a formatted string.
   </li><li><code>getSelectedDevice()</code>: Retrieves the currently selected device from the dropdown menu.
   </li><li><code>sendCommand()</code>: Sends commands to the server to interact with the device, handling responses and errors appropriately.
   </li></ul> 

<b>Event Listeners:</b>
   <ul><li>On page load, the list of devices is fetched from the server, and the first device is selected by default.
   </li><li>Periodic updates to device status are set to occur every minute.
   </li></ul> 
</details>

# index.js

The <code>index.js</code> file implements the server-side logic using Node.js, handling HTTP requests to interact with Tasmota devices. It reads configuration settings, manages user authentication, and serves static files and API endpoints. This part is executed at the server side.

<details>
<summary><b>Server Setup and Configuration</b></summary>

<br><b>Dependencies and Initialization:</b>
   <ul><li>Requires essential modules: <code>http</code>, <code>fs</code>, <code>path</code>, <code>crypto</code>, and <code>url</code>.
   </li><li>Initializes server settings like hostname, port, and debug mode.
   </li><li>Defines utility functions for password hashing, input sanitization, and authentication.
   </li></ul>

<b>Configuration File Loading:</b><br><br>
Reads and parses <code>config.json</code> and <code>settings.json</code> to load user credentials and device accounts.<br>
</details>

<details>
<summary><b>HTTP Server</b></summary>
<br>
<b>Server Creation:</b><br><br>
Creates an HTTP server to listen for incoming requests.<br>

<b>Request Handling:</b><br><br>
Handles different routes based on the request URL:
     <ul><li><code>POST /login</code>: Authenticates users using credentials from the request body.
     </li><li>Serves static files (<code>index.html</code>, <code>styles.css</code>, <code>favicon.ico</code>, and <code>header.png</code>).
     </li><li><code>GET /devices</code>: Returns a list of available Tasmota devices defined in <code>settings.json</code>.
     </li><li>The following device-specific routes are defined (<code>/setPower</code>, <code>/getTime</code>, <code>/setTimer</code>, <code>/clearTimer</code>, <code>/getTimerStatus</code>, <code>/getPowerStatus</code>, <code>/enableTimers</code>, <code>/disableTimers</code>).
     </li></ul>

<b>Command Execution:</b>
 Defines functions to handle device commands:
     <ul><li><code>handleSetPower()</code>: Sets the power state of a device.
     </li><li><code>handleSetTimer()</code>: Sets a timer on a device.
     </li><li><code>handleClearTimer()</code>: Clears a timer on a device.
     </li><li><code>handleGetTimerStatus()</code>, <code>handleGetPowerStatus()</code> <code>handleGetTime()</code>: Fetches current status information from the device for timer, switchstatus and time.
     </li><li><code>handleEnableTimers()</code>, <code>handleDisableTimers()</code> Enables or disables timers on a device.
     </li></ul>

<b>Utility Functions:</b>
   <ul><li><code>isAuthorized()</code>: Checks if a request contains valid authentication credentials.
   </li><li><code>serveStaticFile()</code>: Serves static files from the server's public directory.
   </li><li><code>logMessage()</code>: Logs messages to a file if debug mode is enabled.
   </li><li><code>getRequestOptions()</code>: Prepares HTTP request options for sending commands to Tasmota devices.
   </li><li><code>makeRequest()</code>: Makes HTTP requests to Tasmota devices and processes responses.
   </li><li><code>getCurrentDeviceTime()</code>: Get the current time from the Tasmota device.
   </li><li><code>sanitizeInput()</code>: Sanitize input to prevent XSS attacks.
   </li></ul>
</details>

## Logging and Debugging

The server logs client actions and errors to a log file if debug mode is enabled (by setting 'debug' to 'true' in <code>config.json</code>, providing traceability and aiding in debugging issues. Please be aware that there is no mechanism implemented to manage the logfiles. Logging is only to be switched on to allow for investigation or for development purposes (in order to prevent filesystem overflow).  


