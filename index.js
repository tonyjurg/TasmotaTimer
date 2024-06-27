// file 'index.js' (backend implementation Tasmota Timer)
// full code at https://github.com/tonyjurg/TasmotaTimer
// version 0.2 (27 June 2024)

const http = require('http');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const url = require('url');

const hostname = '0.0.0.0';
const port = 3000;

let debug = false;
let logFilePath = path.join(__dirname, 'server.log');
let users = [];
let accounts = [];

/**
 * Hash a password using bcrypt.
 * @param {string} password - The password to hash.
 * @returns {Promise<string>} The hashed password.
 */
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

/**
 * Authenticate a user with a username and password.
 * @param {string} username - The username of the user.
 * @param {string} password - The password of the user.
 * @returns {Promise<boolean>} True if authentication is successful, otherwise false.
 */
async function authenticate(username, password) {
    const user = users.find(u => u.username === username);
    if (user && typeof password === 'string' && typeof user.password === 'string') {
        return await bcrypt.compare(password, user.password);
    }
    return false;
}

/**
 * Sanitize input to prevent XSS attacks.
 * @param {string} input - The input to sanitize.
 * @returns {string} The sanitized input.
 */
function sanitizeInput(input) {
    const regex = /[<>"'/]/g;
    if (regex.test(input)) {
        logMessage(' !! [sanitizeInput] Input had to be sanitized: ' + input.replace(regex, (char) => `&#${char.charCodeAt(0)};`));
    }
    return input.replace(regex, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * Check if the request is authorized.
 * @param {string} authHeader - The authorization header from the request.
 * @returns {boolean} True if the request is authorized, otherwise false.
 */
function isAuthorized(authHeader) {
    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('ascii').split(':');
    const [username, password] = credentials;
    return authenticate(username, password);
}

/**
 * Serve a static file.
 * @param {string} fileName - The name of the file to serve.
 * @param {string} contentType - The MIME type of the file.
 * @param {object} res - The HTTP response object.
 */
function serveStaticFile(fileName, contentType, res) {
    const filePath = path.join(__dirname, 'public', fileName);
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end('Error loading the page');
            logMessage(' !! [serveStaticFile] Error serving static file ' + fileName);
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
}

/**
 * Log messages to a file if debugging is enabled.
 * @param {string} message - The message to log.
 * Note regarding the symbols used in the log messages:
 *      !! The logmessage relates to a handled error condition
 *      == The logmessage relates to a succesfull backend action
 *      <= The logmessage relates to the backend interacting with the user client (app)
 *      => The logmessage relates to the backend interacting with a Tasmota device
 */
function logMessage(message) {
    if (debug) {
        const logEntry = `${new Date().toISOString()} ${message}\n`;
        fs.appendFile(logFilePath, logEntry, (err) => {
            if (err) {
                console.error('Error writing to log file:', err);
            }
        });
    }
}

/**
 * Handle setting power state for the Tasmota device.
 * @param {string} state - The power state to set (ON/OFF).
 * @param {object} account - The account information for the device.
 * @param {object} res - The HTTP response object.
 * @param {string} clientIp - The client's IP address.
 */
function handleSetPower(state, account, res, clientIp) {
    logMessage(' == [SetPower] Client at ' + clientIp + ' called SetPower setting state to ' + state + ' for device: ' + account.deviceName + ' at ' + account.deviceIP);
    const command = 'Power ' + state;
    const options = getRequestOptions(command, account);
    makeRequest(options, res, null);
}

/**
 * Get the current time from the Tasmota device.
 * @param {object} account - The account information for the device.
 * @param {Date} clientTime - The client's current time.
 * @param {function} callback - The callback function to execute with the time data.
 */
function getCurrentDeviceTime(account, clientTime, callback) {
    const timeOptions = getRequestOptions('Time', account);
    const timeReq = http.request(timeOptions, (timeRes) => {
        let timeData = '';
        timeRes.on('data', (chunk) => timeData += chunk);
        timeRes.on('end', () => {
            try {
                const timeResponse = JSON.parse(timeData);
                const deviceTimeStr = timeResponse.Time;
                const deviceTime = new Date(deviceTimeStr);
                if (isNaN(deviceTime.getTime())) {
                    callback(new Error('Invalid device time format'), null);
                    return;
                }

                const clientHours = clientTime.getUTCHours();
                const clientMinutes = clientTime.getUTCMinutes();
                const deviceHours = deviceTime.getUTCHours();
                const deviceMinutes = deviceTime.getUTCMinutes();
                const timeDeltaMinutes = ((clientHours * 60) + clientMinutes) - ((deviceHours * 60) + deviceMinutes);

                callback(null, {
                    deviceTime,
                    timeDeltaMinutes
                });
            } catch (error) {
                callback(error, null);
            }
        });
    });

    timeReq.on('error', (error) => {
        callback(error, null);
    });

    timeReq.end();
}

/**
 * Handle setting a timer for the Tasmota device.
 * @param {string} hours - The hours to set on the timer.
 * @param {string} minutes - The minutes to set on the timer.
 * @param {string} clientTimeStr - The client's current time as a string.
 * @param {object} account - The account information for the device.
 * @param {object} res - The HTTP response object.
 * @param {string} clientIp - The client's IP address.
 */
function handleSetTimer(hours, minutes, clientTimeStr, account, res, clientIp) {
    logMessage(' == [SetTimer] Client at ' + clientIp + ' called SetTimer with delta ' + hours + ':' + minutes + ' for device: ' + account.deviceName + ' at ' + account.deviceIP);

    const clientTime = new Date(clientTimeStr);
    if (isNaN(clientTime.getTime())) {
        logMessage(' !! [SetTimer] Invalid client time format');
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid client time format');
        return;
    }

    getCurrentDeviceTime(account, clientTime, (error, timeData) => {
        if (error) {
            logMessage(' !! [SetTimer] Error getting device time: ' + error.message);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Server error: ${error.message}`);
            return;
        }

        const { deviceTime, timeDeltaMinutes } = timeData;

        logMessage(' == [SetTimer] Current time for device: ' + account.deviceName + ' at ' + account.deviceIP + ' is ' + deviceTime);
        logMessage(' == [SetTimer] Current time for client at ' + clientIp + ' is ' + clientTime);
        logMessage(' == [SetTimer] Time delta in minutes: ' + timeDeltaMinutes);

        let adjustedDeviceTime = new Date(deviceTime.getTime());
        adjustedDeviceTime.setHours(adjustedDeviceTime.getHours() + parseInt(hours));
        adjustedDeviceTime.setMinutes(adjustedDeviceTime.getMinutes() + parseInt(minutes));
        logMessage(' == [SetTimer] Timer set on the Tasmota device: ' + adjustedDeviceTime);

        const sequence = Array(7).fill(0);
        sequence[adjustedDeviceTime.getDay()] = 1;
        const dayArray = sequence.join('');

        const command = `Timer1 {"Enable":1,"Mode":0,"Time":"${adjustedDeviceTime.getHours().toString().padStart(2, '0')}:${adjustedDeviceTime.getMinutes().toString().padStart(2,'0')}:00","Window":0,"Days":"${dayArray}","Repeat":0,"Output":1,"Action":0}`;
        const options = getRequestOptions(command, account);
        logMessage(' == [SetTimer] Timer setting to be sent: ' + adjustedDeviceTime.getHours().toString().padStart(2, '0') + ':' + adjustedDeviceTime.getMinutes().toString().padStart(2, '0') + ' on day: ' + dayArray);

        makeRequest(options, res, () => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    });
}

/**
 * Handle getting the timer status for a device.
 * @param {string} clientTimeStr - The client's current time as a string.
 * @param {object} account - The account information for the device.
 * @param {object} res - The HTTP response object.
 * @param {string} clientIp - The client's IP address.
 */
function handleGetTimerStatus(clientTimeStr, account, res, clientIp) {
    logMessage(' == [GetTimerStatus] Client at ' + clientIp + ' called GetTimerStatus for device: ' + account.deviceName + ' at ' + account.deviceIP);

    const clientTime = new Date(clientTimeStr);
    if (isNaN(clientTime.getTime())) {
        logMessage(' !! [GetTimerStatus] Invalid time format received from client at ' + clientIp);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid client time format');
        return;
    }

    getCurrentDeviceTime(account, clientTime, (error, timeData) => {
        if (error) {
            logMessage(' !! [GetTimerStatus] Error getting device time: ' + error.message);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Server error: ${error.message}`);
            return;
        }

        const { deviceTime, timeDeltaMinutes } = timeData;

        logMessage(' == [GetTimerStatus] Current time for device: ' + account.deviceName + ' at ' + account.deviceIP + ' is ' + deviceTime);
        logMessage(' == [GetTimerStatus] Current time for client at ' + clientIp + ' is ' + clientTime);
        logMessage(' == [GetTimerStatus] Time delta in minutes: ' + timeDeltaMinutes);

        const command = 'Timer1';
        const options = getRequestOptions(command, account);
        makeRequest(options, res, (timerData) => {
            if (timerData.Timer1 && timerData.Timer1.Enable) {
                const [hours, minutes] = timerData.Timer1.Time.split(':').map(Number);
                const dowMap = timerData.Timer1.Days;

                const timerEnd = new Date(clientTime);
                timerEnd.setHours(hours);
                timerEnd.setMinutes(minutes + timeDeltaMinutes);
                timerEnd.setSeconds(0);
                timerEnd.setMilliseconds(0);

                // Calculate the next occurrence based on dowMap
                let nextDay = timerEnd.getDay();
                while (dowMap[nextDay] !== '1') {
                    nextDay = (nextDay + 1) % 7;
                    timerEnd.setDate(timerEnd.getDate() + 1);
                }

                const remainingTimeMs = timerEnd - clientTime;
                const remainingHours = Math.floor(remainingTimeMs / (1000 * 60 * 60));
                const remainingMinutes = Math.floor((remainingTimeMs % (1000 * 60 * 60)) / (1000 * 60));

                const daysOfWeek = ["Sun.", "Mon.", "Tues.", "Wed.", "Thur.", "Fri.", "Sat."];
                const dayOfWeek = daysOfWeek[timerEnd.getDay()];

                // Correct the hours if they are 24 or more
                const displayHours = timerEnd.getHours();
                const formattedHours = displayHours === 24 ? '00' : displayHours.toString().padStart(2, '0');

                const humanReadableTime = `${dayOfWeek}, ${formattedHours}:${timerEnd.getMinutes().toString().padStart(2, '0')} (${remainingHours} hours and ${remainingMinutes} minutes left)`;

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ humanReadableTime }));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ humanReadableTime: 'Timer not set or expired' }));
            }
        });
    });
}

/**
 * Handle clearing the timer for a device.
 * @param {object} account - The account information for the device.
 * @param {object} res - The HTTP response object.
 * @param {string} clientIp - The client's IP address.
 */
function handleClearTimer(account, res, clientIp) {
    logMessage(' == [ClearTimer] Client at ' + clientIp + ' called ClearTimer for device: ' + account.deviceName + ' at ' + account.deviceIP);
    const command = 'Timer1 {"Enable":0,"Mode":0,"Time":"00:00","Window":0,"Days":"0000000","Repeat":0,"Output":1,"Action":0}';
    const options = getRequestOptions(command, account);
    makeRequest(options, res, null);
}

/**
 * Handle getting the current time from a device.
 * @param {object} account - The account information for the device.
 * @param {object} res - The HTTP response object.
 * @param {string} clientIp - The client's IP address.
 */
function handleGetTime(account, res, clientIp) {
    logMessage(' == [GetTime] Client at ' + clientIp + ' called GetTime for device: ' + account.deviceName + ' at ' + account.deviceIP);
    const command = 'Time';
    const options = getRequestOptions(command, account);
    makeRequest(options, res, null);
}

/**
 * Handle getting the power status for a device.
 * @param {object} account - The account information for the device.
 * @param {object} res - The HTTP response object.
 * @param {string} clientIp - The client's IP address.
 */
function handleGetPowerStatus(account, res, clientIp) {
    logMessage(' == [GetPowerStatus] Client at ' + clientIp + ' called GetPowerStatus for device: ' + account.deviceName + ' at ' + account.deviceIP);
    const command = 'Power';
    const options = getRequestOptions(command, account);
    makeRequest(options, res, null);
}

/**
 * Handle enabling timers for a device.
 * @param {object} account - The account information for the device.
 * @param {object} res - The HTTP response object.
 * @param {string} clientIp - The client's IP address.
 */
function handleEnableTimers(account, res, clientIp) {
    logMessage(' == [EnableTimers] Client at ' + clientIp + ' called EnableTimers for device: ' + account.deviceName + ' at ' + account.deviceIP);
    const command = 'Timers 1';
    const options = getRequestOptions(command, account);
    makeRequest(options, res, null);
}

/**
 * Handle disabling timers for a device.
 * @param {object} account - The account information for the device.
 * @param {object} res - The HTTP response object.
 * @param {string} clientIp - The client's IP address.
 */
function handleDisableTimers(account, res, clientIp) {
    logMessage(' == Client at ' + clientIp + ' called DisableTimers for device: ' + account.deviceName + ' at ' + account.deviceIP);
    const command = 'Timers 0';
    const options = getRequestOptions(command, account);
    makeRequest(options, res, null);
}

/**
 * Get request options for the Tasmota device.
 * @param {string} command - The command to send to the device.
 * @param {object} account - The account information for the device.
 * @returns {object} The request options.
 */
function getRequestOptions(command, account) {
    return {
        hostname: account.deviceIP,
        port: 80,
        path: `/cm?cmnd=${encodeURIComponent(command)}`,
        method: 'GET',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(`${account.username}:${account.password}`).toString('base64')
        }
    };
}

/**
 * Make a request to the Tasmota device.
 * @param {object} options - The request options.
 * @param {object} res - The HTTP response object.
 * @param {function} callback - The callback function to execute with the response data.
 */
function makeRequest(options, res, callback) {
    logMessage(' => [makeRequest] Sending HTTP request with options: ' + JSON.stringify(options));
    const req = http.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => {
            if (callback) {
                callback(JSON.parse(data), res);
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data);
            }
        });
    });
    req.on('error', (error) => {
        logMessage(' !! [makeRequest] Request Error: ' + error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server error: ${error.message}`);
    });
    req.end();
}

// **********************************************
// *               MAIN PART                    *
// **********************************************

// Read and parse configuration file for the node.js server
fs.readFile('config.json', 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading config file:', err);
        return;
    }
    try {
        const config = JSON.parse(data);
        debug = config.debug || false;
        logFilePath = config.logFilePath ? path.resolve(config.logFilePath) : logFilePath;
        users = config.users.map(user => ({
            username: user.username,
            password: hashPassword(user.password)
        }));
    } catch (parseErr) {
        console.error('Error parsing config file:', parseErr);
    }
});

// Read and parse Tasmota devices settings file
fs.readFile('settings.json', 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading settings file:', err);
        return;
    }
    try {
        accounts = JSON.parse(data);
    } catch (parseErr) {
        console.error('Error parsing settings file:', parseErr);
    }
});

// Create HTTP server
const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Handle login request
    if (pathname === '/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const { username, password } = JSON.parse(body);
            if (authenticate(username, password)) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } else {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false }));
            }
        });
        return;
    }

    // Check for authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !isAuthorized(authHeader)) {
        res.writeHead(401, { 'Content-Type': 'text/plain', 'WWW-Authenticate': 'Basic' });
        res.end('Unauthorized');
        return;
    }

    // Serve static files
    if (pathname === '/' || pathname === '/index.html') {
        serveStaticFile('index.html', 'text/html', res);
        logMessage(' == [HTTP server] Serving file index.html to client at ' + clientIp);
        return;
    }
    if (pathname === '/styles.css') {
        serveStaticFile('styles.css', 'text/css', res);
        logMessage(' == [HTTP server] Serving file styles.css to client at ' + clientIp);
        return;
    }
    if (pathname === '/favicon.ico') {
        serveStaticFile('favicon.ico', 'image/x-icon', res);
        logMessage(' == [HTTP server] Serving file favicon.ico to client at ' + clientIp);
        return;
    }
    if (pathname === '/header.png') {
        serveStaticFile('header.png', 'image/png', res);
        logMessage(' == [HTTP server] Serving file header.png to client at ' + clientIp);
        return;
    }

    // Serve list of devices
    if (pathname === '/devices') {
        logMessage(' == [HTTP server] Serving list of devices to client at ' + clientIp);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(accounts.map(acc => ({ deviceName: acc.deviceName }))));
        return;
    }

    // Handle device-specific requests
    const deviceName = parsedUrl.searchParams.get('device');
    const account = accounts.find(acc => acc.deviceName === deviceName);

    if (!deviceName || !account) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid device name');
        logMessage(' !! [HTTP server] Invalid device name "' + deviceName + '" received from client at ' + clientIp);
        return;
    }

    logMessage(' <= [HTTP server] Received request: ' + pathname + ' from: ' + clientIp + ' with parameters: ' + parsedUrl.searchParams);

    // Route requests to appropriate handler
    switch (pathname) {
        case '/setPower':
            handleSetPower(sanitizeInput(parsedUrl.searchParams.get('state')), account, res, clientIp);
            break;
        case '/getTime':
            handleGetTime(account, res, clientIp);
            break;
        case '/setTimer':
            handleSetTimer(parsedUrl.searchParams.get('hours'), parsedUrl.searchParams.get('minutes'), parsedUrl.searchParams.get('clienttime'), account, res, clientIp);
            break;
        case '/clearTimer':
            handleClearTimer(account, res, clientIp);
            break;
        case '/getTimerStatus':
            handleGetTimerStatus(parsedUrl.searchParams.get('clienttime'), account, res, clientIp);
            break;
        case '/getPowerStatus':
            handleGetPowerStatus(account, res, clientIp);
            break;
        case '/enableTimers':
            handleEnableTimers(account, res, clientIp);
            break;
        case '/disableTimers':
            handleDisableTimers(account, res, clientIp);
            break;
        default:
            logMessage(' !! [HTTP server] Route ' + pathname + ' not found');
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
    }
});

// Start the server
server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
