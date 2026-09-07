## Purpose

Hosts a real, self-hosted IRC service embedded in the game server so ordinary IRC clients and bots can connect over plain TCP, join the town channel, and exchange messages with players.

## Requirements

### Requirement: IRC listener and connection registration
The server SHALL listen for IRC client connections on a TCP port configurable by environment (default 6667) and SHALL complete registration only after receiving both NICK and USER, replying with standard welcome numerics (001–004). Commands that require registration before it completes SHALL be rejected with the appropriate error numeric instead of crashing or being ignored silently.

#### Scenario: Successful registration
- **WHEN** a TCP client sends valid NICK and USER commands
- **THEN** the client receives numerics 001–004 including the server name and its own nickname, and is considered registered

#### Scenario: Message before registration
- **WHEN** an unregistered client sends PRIVMSG
- **THEN** the client receives an ERR_NOTREGISTERED (451) numeric and the connection stays open

### Requirement: Unique nickname registry
The server SHALL enforce case-insensitively unique nicknames across all IRC connections. A NICK request for an in-use name SHALL be rejected with ERR_NICKNAMEINUSE (433) and SHALL NOT disconnect or rename the existing holder. Nicknames SHALL be sanitized to RFC-style nick characters.

#### Scenario: Nick collision
- **WHEN** a connecting client requests a nickname already held by another connection
- **THEN** the newcomer receives 433 and must choose another nickname; the existing holder is unaffected

#### Scenario: Valid nick change
- **WHEN** a registered client sends NICK with an unused name
- **THEN** all channels the client is in receive a :old!user@host NICK :new notice

### Requirement: Standard channel `#afterlight`
The server SHALL always provide the standard channel `#afterlight` with a set topic. JOINing it SHALL deliver the topic (332) and the member list (353/end of names 366) to the joiner, and SHALL announce the join to existing members. PART and QUIT SHALL be announced to remaining members.

#### Scenario: Join sees channel state
- **WHEN** a registered client JOINs `#afterlight`
- **THEN** it receives the topic, the NAMES list including prior members, and prior members receive the JOIN announcement

### Requirement: Message relay (channel and direct)
The server SHALL relay PRIVMSG with a channel target to all channel members except the sender, and PRIVMSG with a nickname target only to that target connection. Invalid targets SHALL receive standard error numerics (411 no recipient, 401 no such nick/channel) without killing the sender.

#### Scenario: Channel message fan-out
- **WHEN** a member sends PRIVMSG `#afterlight` :hello
- **THEN** every other member receives `:sender!user@host PRIVMSG #afterlight :hello`

#### Scenario: Direct message delivery
- **WHEN** a client sends PRIVMSG to an online nickname
- **THEN** only that nickname's connection receives the message

### Requirement: Keepalive and disconnect handling
The server SHALL send PING to idle connections and disconnect any connection that fails to respond within a timeout. QUIT SHALL close the connection, remove it from all channels, and announce departure. Unclean TCP disconnects SHALL be cleaned up identically.

#### Scenario: Dead client reaping
- **WHEN** a connection does not answer the server PING within the timeout
- **THEN** the connection is closed and channel members receive the QUIT announcement

### Requirement: Tolerant protocol surface
The server SHALL limit each command line to 512 bytes (splitting or truncating safely), tolerate unknown commands with ERR_UNKNOWNCOMMAND (421), and not crash on malformed input. The server SHALL support at least 50 concurrent client connections independently.

#### Scenario: Malformed input
- **WHEN** a client sends an unrecognized command or garbage bytes
- **THEN** the server replies 421 (or ignores safely) and the connection and other clients continue working

### Requirement: Operator authentication
The server SHALL accept an OPER command whose name and password match configured environment credentials and SHALL mark that connection as an operator (+o mode visible in NAMES); mismatched credentials SHALL be rejected with ERR_PASSWDESCMISMATCH (464). Operator status grants no ability beyond standard channel behavior in this change.

#### Scenario: Successful oper
- **WHEN** a client sends OPER with the configured credentials
- **THEN** the connection receives the oper welcome numeric (381) and shows as an operator

#### Scenario: Wrong password
- **WHEN** a client sends OPER with wrong credentials
- **THEN** it receives 464 and gains no operator status
