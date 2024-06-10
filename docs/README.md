# Tasmota Timer

This application provides an easy-to-use interface for setting and controlling timers on Tasmota-powered smart plugs. Users can manage the timer on their Tasmota devices through a web interface accessible from various devices, including mobile phones and PCs.

### System Overview

The system is composed of two main components:

1. **Front-End**: The application interface that interacts directly with the end-user.
2. **Back-End**: The Node.js backend that communicates with both the app and the Tasmota devices.

[Click here](implementationDescription.md) for a more detailed implementation description.

[Click here](codeDocumentation.md) for an overview of the code.

### Key Features

- **User-Friendly Interface**: Simple and intuitive web interface for controlling the timer on smart plugs.
- **Cross-Device Access**: Accessible via mobile phones, PCs, and other devices.
- **Secure Authentication**: Decoupled user and device authentication for enhanced security.
- **Subnet Support**: Operates across different subnets to improve security.
- **Logging**: Extensive logging capabilities for monitoring and troubleshooting.

[Click here](features.md) for a full list of features.

### Deployment

The Node.js backend can be hosted on an always-on device, such as a NAS (e.g., Synology), ensuring constant availability and reliability.
