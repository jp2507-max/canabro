/**
 * Custom mock/polyfill for the ws module in React Native
 * This replaces the Node.js-dependent ws implementation with React Native compatible code
 */

// Import the EventEmitter for compatibility
const EventEmitter = require('events');

// Use React Native's native WebSocket implementation
const NativeWebSocket = global.WebSocket;

// Create a WebSocket class that wraps the native implementation
// but provides the same API as the Node.js ws module
class WebSocket extends EventEmitter {
  constructor(address, protocols, options) {
    super();
    
    this.readyState = WebSocket.CONNECTING;
    this._socket = new NativeWebSocket(address, protocols);

    // Map native WebSocket events to Node.js ws events
    this._socket.onopen = () => {
      this.readyState = WebSocket.OPEN;
      this.emit('open');
    };

    this._socket.onclose = (event) => {
      this.readyState = WebSocket.CLOSED;
      this.emit('close', event.code, event.reason);
    };

    this._socket.onerror = (error) => {
      this.emit('error', error);
    };

    this._socket.onmessage = (event) => {
      let data = event.data;
      
      // Try to parse JSON if it's a string
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          // Not JSON, keep as string
        }
      }
      
      this.emit('message', data);
    };
  }

  // WebSocket readyState constants
  static get CONNECTING() { return 0; }
  static get OPEN() { return 1; }
  static get CLOSING() { return 2; }
  static get CLOSED() { return 3; }

  // Methods that match the ws API
  send(data) {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    
    // Convert objects to JSON strings
    if (typeof data === 'object') {
      data = JSON.stringify(data);
    }
    
    this._socket.send(data);
  }
  close(code, reason) {
    if (this.readyState === WebSocket.OPEN) {
      this.readyState = WebSocket.CLOSING;
      this._socket.close(code, reason);
    }
  }

  // Stub for ping/pong (not supported in browser WebSocket)
  ping() {
    console.warn('WebSocket.ping() is not supported in React Native');
  }
}

// Create a mock WebSocketServer class
class WebSocketServer extends EventEmitter {
  constructor(options) {
    super();
    this.clients = new Set();
    this.path = options?.path || '/';
    this.options = options || {};
    console.warn('WebSocketServer is mocked in React Native environment and will not function');
  }

  close(callback) {
    this.clients.clear();
    if (typeof callback === 'function') callback();
    return this;
  }

  // Add other WebSocketServer methods as needed
  shouldHandle() { return false; }
  
  handleUpgrade() {
    console.warn('WebSocketServer.handleUpgrade() is not supported in React Native');
  }
  
  completeUpgrade() {
    console.warn('WebSocketServer.completeUpgrade() is not supported in React Native');
  }
}

// Export both classes to match the ws module API
module.exports = {
  WebSocket,
  WebSocketServer,
  createWebSocketStream: () => {
    console.warn('createWebSocketStream is not supported in React Native');
    return null;
  }
};
