# Requirements Document

## Introduction

Hermes Desktop Linux is an Electron + TypeScript desktop client for Hermes over SSH. The core service layer (SSH transport, remote discovery, file read/write, session browsing, connection profile CRUD) is fully ported. This feature covers the remaining MVP work: terminal integration via xterm.js + node-pty, full interactive UI for all five sections (Connections, Overview, Files, Sessions, Terminal), and user-facing error handling with status messages.

## Glossary

- **App**: The Hermes Desktop Linux Electron application
- **Renderer**: The Electron renderer process that hosts the UI
- **Main_Process**: The Electron main process that owns node-pty instances and IPC handlers
- **Terminal_Widget**: An xterm.js terminal instance rendered in the UI
- **PTY**: A node-pty pseudo-terminal process spawned in the Main_Process
- **Connection_Profile**: A locally stored SSH connection configuration (id, label, host, port, user, alias)
- **Connection_Selector**: A UI control that lets the user pick the active Connection_Profile
- **Discovery_Result**: The JSON object returned by the remote discovery service describing the remote ~/.hermes workspace
- **Tracked_File**: One of the three remote Hermes files (USER.md, MEMORY.md, SOUL.md)
- **Session_Summary**: A row in the session list showing id, title, date, message count, and preview
- **Session_Transcript**: The full ordered list of messages for a single Hermes session
- **Status_Bar**: A UI region that displays transient status messages, errors, and loading indicators
- **Tab_Bar**: A UI control within the Terminal section that manages multiple terminal tabs

## Requirements

### Requirement 1: Terminal PTY Lifecycle

**User Story:** As a user, I want to open an interactive SSH terminal to a remote host, so that I can run commands on the Hermes server directly from the desktop app.

#### Acceptance Criteria

1. WHEN the user opens a new terminal tab for a Connection_Profile, THE Main_Process SHALL spawn a PTY running `ssh` with the arguments returned by `getShellArguments()` for that Connection_Profile
2. WHEN the PTY emits output data, THE Main_Process SHALL forward the data to the corresponding Terminal_Widget in the Renderer via IPC
3. WHEN the Terminal_Widget receives user keystrokes, THE Renderer SHALL forward the input to the corresponding PTY in the Main_Process via IPC
4. WHEN the user closes a terminal tab, THE Main_Process SHALL kill the associated PTY process and release its resources
5. WHEN the Renderer window is closed, THE Main_Process SHALL kill all active PTY processes
6. IF the PTY process exits unexpectedly, THEN THE Main_Process SHALL notify the Renderer, and THE Terminal_Widget SHALL display the exit code and a message indicating the session ended

### Requirement 2: Terminal Tab Management

**User Story:** As a user, I want to manage multiple terminal tabs, so that I can have concurrent SSH sessions to different hosts.

#### Acceptance Criteria

1. THE Terminal section SHALL display a Tab_Bar showing all open terminal tabs
2. WHEN the user clicks "New Terminal", THE App SHALL prompt the user to select a Connection_Profile and then open a new terminal tab connected to that host
3. WHEN the user clicks a tab in the Tab_Bar, THE Terminal section SHALL switch the visible Terminal_Widget to the selected tab
4. WHEN the user closes a tab via the Tab_Bar close button, THE App SHALL close the terminal tab and kill the associated PTY
5. THE Tab_Bar SHALL display the Connection_Profile label as the tab title
6. WHEN only one terminal tab remains open and the user closes the tab, THE Terminal section SHALL display an empty state prompting the user to open a new terminal

### Requirement 3: Terminal Rendering

**User Story:** As a user, I want the terminal to render correctly and resize responsively, so that I have a usable shell experience.

#### Acceptance Criteria

1. THE Terminal_Widget SHALL render terminal output using xterm.js with the FitAddon
2. WHEN the Terminal section is resized (window resize or layout change), THE Terminal_Widget SHALL refit to the available space and THE Renderer SHALL send the new column and row dimensions to the Main_Process
3. WHEN the Main_Process receives updated dimensions for a PTY, THE Main_Process SHALL resize the PTY to match
4. THE Terminal_Widget SHALL use a monospace font and a dark color scheme consistent with the App theme

### Requirement 4: Connection Profile Editor

**User Story:** As a user, I want to create, edit, test, and delete SSH connection profiles, so that I can manage my remote hosts.

#### Acceptance Criteria

1. THE Connections section SHALL display a list of all saved Connection_Profiles sorted alphabetically by label
2. WHEN the user clicks "Add Connection", THE App SHALL display a form with fields for label, SSH alias, SSH host, SSH port, and SSH user
3. WHEN the user submits the connection form with valid data, THE App SHALL save the Connection_Profile via the `upsertConnection` IPC call and refresh the list
4. WHEN the user clicks "Edit" on an existing Connection_Profile, THE App SHALL populate the form with the existing values
5. WHEN the user clicks "Delete" on a Connection_Profile, THE App SHALL prompt for confirmation and then delete the profile via the `deleteConnection` IPC call
6. WHEN the user clicks "Test" on a Connection_Profile, THE App SHALL invoke the `testConnection` IPC call, which SHALL verify that the SSH target is reachable, that authentication succeeds without interactive prompts, and that `python3` is available on the remote host, and display the result (success with remote home path, or error message) in the Status_Bar
7. WHEN a connection test succeeds, THE App SHALL display a "Use Host" action that, when clicked, sets the tested Connection_Profile as the active connection (equivalent to selecting it in the Connection_Selector)
8. IF the connection form is submitted with an empty label or with both SSH alias and SSH host empty, THEN THE App SHALL display a validation error and prevent submission

### Requirement 5: Connection Selector

**User Story:** As a user, I want to select an active connection that is used across the Overview, Files, and Sessions sections, so that I do not have to re-pick a host for every operation.

#### Acceptance Criteria

1. THE App SHALL display a Connection_Selector in the main content header area, visible in the Overview, Files, and Sessions sections
2. WHEN the user selects a Connection_Profile from the Connection_Selector, THE App SHALL store the selection as the active connection and persist the choice via the `savePreferences` IPC call
3. WHEN the App starts, THE App SHALL restore the last active connection from preferences via the `loadPreferences` IPC call
4. WHILE no Connection_Profile is selected, THE Overview, Files, and Sessions sections SHALL display a message prompting the user to select a connection
5. WHEN the active connection is deleted from the Connections section, THE App SHALL clear the active connection selection

### Requirement 6: Overview and Discovery Section

**User Story:** As a user, I want to see the remote Hermes workspace status after connecting, so that I know which files and session stores exist on the host.

#### Acceptance Criteria

1. WHEN the user navigates to the Overview section with an active connection, THE App SHALL invoke the `discover` IPC call for the active Connection_Profile
2. WHEN the Discovery_Result is received, THE Overview section SHALL display: remote home path, hermes home path, existence status of each Tracked_File, and session store information (kind, path, tables)
3. WHEN the user clicks a "Refresh" button in the Overview section, THE App SHALL re-invoke the `discover` IPC call and update the display
4. IF the discovery call fails, THEN THE Overview section SHALL display the error message in the Status_Bar

### Requirement 7: File Editor Section

**User Story:** As a user, I want to read and edit the remote Hermes configuration files (USER.md, MEMORY.md, SOUL.md), so that I can customize Hermes behavior.

#### Acceptance Criteria

1. THE Files section SHALL display three file tabs corresponding to the three Tracked_Files (USER.md, MEMORY.md, SOUL.md)
2. WHEN the user selects a file tab, THE App SHALL invoke the `readFile` IPC call for the selected Tracked_File and display the content in a text editor area
3. WHEN the user edits the file content and clicks "Save", THE App SHALL invoke the `writeFile` IPC call with the updated content
4. WHEN the save operation succeeds, THE Status_Bar SHALL display a success message
5. IF the read or write operation fails, THEN THE Status_Bar SHALL display the error message
6. WHILE a file read or write operation is in progress, THE Files section SHALL display a loading indicator and disable the Save button


### Requirement 8: Session Browser Section

**User Story:** As a user, I want to browse and read Hermes conversation sessions on the remote host, so that I can review past interactions.

#### Acceptance Criteria

1. WHEN the user navigates to the Sessions section with an active connection, THE App SHALL invoke the `listSessions` IPC call and display a list of Session_Summaries
2. THE session list SHALL display each Session_Summary with its title, started date, last active date, message count, and preview text
3. WHEN the user clicks a Session_Summary in the list, THE App SHALL invoke the `loadTranscript` IPC call and display the Session_Transcript as a scrollable message list
4. THE Session_Transcript view SHALL display each message with its role, content, and timestamp
5. WHEN the user clicks a "Back" button in the transcript view, THE App SHALL return to the session list
6. THE session list SHALL support paginated loading by fetching additional pages when the user scrolls to the bottom or clicks "Load More"
7. IF the session list or transcript load fails, THEN THE Status_Bar SHALL display the error message

### Requirement 9: Status Bar and Error Handling

**User Story:** As a user, I want to see clear feedback when operations succeed, fail, or are in progress, so that I understand the current state of the application.

#### Acceptance Criteria

1. THE App SHALL display a Status_Bar at the bottom of the main content area
2. WHEN an asynchronous operation begins, THE Status_Bar SHALL display a loading message describing the operation (e.g., "Connecting to host...", "Loading sessions...")
3. WHEN an asynchronous operation succeeds, THE Status_Bar SHALL display a success message for 4 seconds and then clear
4. WHEN an asynchronous operation fails, THE Status_Bar SHALL display the error message with a distinct error style and THE message SHALL remain visible until the user dismisses the message or a new status message replaces the message
5. IF an IPC call throws an error, THEN THE Renderer SHALL catch the error and display the error message in the Status_Bar instead of failing silently

### Requirement 10: Section Navigation

**User Story:** As a user, I want to navigate between the five app sections using the sidebar, so that I can access all features of the application.

#### Acceptance Criteria

1. THE sidebar SHALL display navigation buttons for Connections, Overview, Files, Sessions, and Terminal sections
2. WHEN the user clicks a navigation button, THE App SHALL show the corresponding section and hide all other sections
3. THE sidebar SHALL visually indicate the currently active section
4. WHEN the App starts, THE App SHALL display the Connections section by default
