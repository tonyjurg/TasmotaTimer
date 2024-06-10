### Deploying the Tasmota Timer

#### Overview

This document provides an  explanation of implementing the Tasmota Timer Control system using Node.js and web technologies. 
The system allows users to control Tasmota devices through a web interface. It is designed to be hosted on an always-on device like a NAS (e.g., Synology) and accessed via various user devices (mobile, PC, etc.). The system supports decoupled user and device authentication and can operate across different subnets for enhanced security.

#### System Components

1. **Node.js Server**:
   - Hosts the web interface and handles communication with Tasmota devices.
   - Manages user authentication and serves static files.
   - Executes commands on Tasmota devices via HTTP requests.

2. **Web Interface (index.html)**:
   - Provides a user-friendly interface for device control.
   - Utilizes JavaScript for dynamic interactions and real-time updates.

3. **Configuration and Settings Files**:
   - `config.json`: Stores server configurations regarding logging and user credentials (username and password).
   - `settings.json`: Contains a list of Tasmota devices, each with details on user-friendly name, IP adress, and account details (username and password).

#### Installation and Setup

##### Prerequisites

- Node.js and npm need to be installed on the NAS or always-on device.
- Tasmota devices are configured and connected to a WiFi network accesable to the device running the node.js.
- Users’ credentials and devices’ details are available for configuration in the two json files.

##### Step-by-Step Setup

1. **Install Node.js on NAS**:
   - Follow the specific NAS documentation to install Node.js.
   - For Synology, you can install Node.js from the Synology Package Center or install it manually if this is not available.

2. **Prepare the Project Directories**:
   - Create a project directory on the NAS. For Synology, you can browse to a web-directory create a dedicated directory from there.
   - Copy the `index.js`, `index.html`, `config.json`, and `settings.json` files into the main directory.
   - Create a subdirectory `public` and store the files `index.html`, `index.css`, and `favicon.ico` in this directory.

3. **Install Dependencies**:
   - Navigate to the project directory.
   - Run `npm init -y` to create a `package.json` file.
   - Install required dependencies:
     ```bash
     npm install http fs path crypto url
     ```

4. **Configure Server Settings**:
   - Edit `config.json` to set `debug`, `logFilePath`, and user credentials. For example:
     ```json
     {
       "debug": true,
       "logFilePath": "/path/to/logfile.log",
       "users": [
         {
           "username": "user1",
           "password": "user1password"
         }
       ]
     }
     ```
   - Edit `settings.json` to add Tasmota device details. For example:
     ```json
     {
       "devices": [
         {
           "deviceName": "Device1",
           "deviceIP": "192.168.1.100",
           "username": "admin",
           "password": "devicepassword"
         }
       ]
     }
     ```

5. **Start the Server**:
   - Run the server using Node.js:
     ```bash
     node index.js
     ```
   - Ensure the server is running and accessible from the network.
   Note this is not activating a permanent excecution of the node.js!

##### Accessing the Web Interface

- Open a web browser on any user device (mobile, PC, etc.).
- Navigate to the server's IP address and port (e.g., `http://192.168.1.2:3000`).

#### Security Considerations

One of the reasons for creation of this node.js app was to enhance security. For any user to set a timer on a Tasmota device, they could simply log in, navigate to the right sections and define/set/clear any timer. The drawback is that these endusers will use a password which will enable them to perform any action on the Tasmota device. Furthermore they need to be granted full IP access to these devices, which violates the concept of seperation of a user LAN from an IOT LAN.

1. **Subnets for Security**:
   - If possible, place the Tasmota devices and user devices on different subnets.
   - Using different subnets will allow for the configuration of firewall rules to restrict access between subnets.
   - To obtain better security, only allow the NAS to communicate with both subnets.

2. **Decoupled Authentication**:
   - User authentication is managed by the Node.js server.
   - Device authentication is handled separately using credentials stored in `settings.json`.
   - This separation enhances security by ensuring that the enduse does not need to use the Tasmota credentials or directly connects to the Tasmota devices.

3. **Security of Communication**:
   - Basic authentication is being used.
   - Use strong passwords and change them regularly for both users and the Tasmota devices.

#### Troubleshooting

1. **Common Issues**:
   - **Server Not Accessible**: Check if the NAS is online and the Node.js server is running.
   - **Authentication Failures**: Ensure credentials in `config.json` (for the Tasmota devices) and `settings.json` (for the clients) are correct.
   - **Device Communication**: Verify network settings and firewall rules allow the node.js server to communicate with the Tasmota device(s).

2. **Logs and Debugging**:
   - Enable debug mode in `config.json` to log detailed messages. This will append log messages to the specified logfile.
   - Check the log file specified in `logFilePath` for error messages and operational logs. This can be done using `tail -f` on the node.js server.
