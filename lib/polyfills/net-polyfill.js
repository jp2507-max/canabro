/**
 * Mock implementation of the 'net' module for React Native
 * This provides stubs for common net module functionality
 */

const EventEmitter = require('events');

class Socket extends EventEmitter {
  constructor(options) {
    super();
    this.options = options || {};
    this.destroyed = false;
    this.connecting = false;
    this.pending = false;
  }
  connect() {
    console.warn('Socket.connect() is not supported in React Native');
    this.connecting = true;
    
    // Simulate failure after a short delay
    setTimeout(() => {
      this.connecting = false;
      // notify optimistic listeners
      this.emit('connect');
      // and immediately fail – keeps consumer state machines alive
      this.emit('error', new Error('Socket connections are not supported in React Native'));
    }, 100);
    
    return this;
  }
  end(data, encoding, callback) {
    // Note: data parameter is ignored as this is a mock implementation
    this.destroyed = true;
    this.emit('close');
    if (typeof callback === 'function') callback();
    return this;
  }

  destroy() {
    this.destroyed = true;
    return this;
  }

  setKeepAlive() { return this; }
  setNoDelay() { return this; }
  setTimeout() { return this; }
  
  // Add additional Socket methods as needed
}

// Server class (stub)
class Server extends EventEmitter {
  constructor(options, connectionListener) {
    super();
    this.options = options;
    
    if (typeof connectionListener === 'function') {
      this.on('connection', connectionListener);
    }
    
    console.warn('net.Server is not supported in React Native');
  }
  
  listen() {
    console.warn('Server.listen() is not supported in React Native');
    
    // Emit error after a delay
    setTimeout(() => {
      this.emit('error', new Error('Server.listen() is not supported in React Native'));
    }, 100);
    
    return this;
  }
  
  close(callback) {
    if (typeof callback === 'function') callback();
    return this;
  }
  
  // Add additional Server methods as needed
}

// Export the mocked module
module.exports = {
  Socket,
  Server,
  createServer: (options, connectionListener) => {
    return new Server(options, connectionListener);
  },
  createConnection: (options, connectListener) => {
    const socket = new Socket(options);
    if (typeof connectListener === 'function') {
      socket.on('connect', connectListener);
    }
    return socket.connect();
  },
  connect: (options, connectListener) => {
    return module.exports.createConnection(options, connectListener);
  },
  // Add additional net module exports as needed
};
