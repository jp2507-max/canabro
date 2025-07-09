/**
 * Platform utilities to replace removed Node.js packages with Expo equivalents
 * 
 * This module provides replacements for:
 * - react-native-crypto -> expo-crypto
 * - react-native-fs -> expo-file-system  
 * - react-native-tcp -> Not needed for mobile apps
 */

import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';

/**
 * Crypto utilities using expo-crypto
 * Replaces react-native-crypto functionality
 */
export const crypto = {
  /**
   * Generate random bytes
   */
  randomBytes: async (length: number): Promise<Uint8Array> => {
    const randomString = await Crypto.getRandomBytesAsync(length);
    return new Uint8Array(randomString);
  },

  /**
   * Create hash digest
   */
  digest: async (
    algorithm: Crypto.CryptoDigestAlgorithm,
    data: string,
    options?: Crypto.CryptoDigestOptions
  ): Promise<string> => {
    return await Crypto.digestStringAsync(algorithm, data, options);
  },

  /**
   * Common hash functions
   */
  sha256: async (data: string): Promise<string> => {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
  },

  sha1: async (data: string): Promise<string> => {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, data);
  },

  md5: async (data: string): Promise<string> => {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, data);
  },
};

/**
 * File system utilities using expo-file-system
 * Replaces react-native-fs functionality
 */
export const fs = {
  /**
   * Common directories
   */
  documentDirectory: FileSystem.documentDirectory,
  cacheDirectory: FileSystem.cacheDirectory,
  bundleDirectory: FileSystem.bundleDirectory,

  /**
   * Read file as string
   */
  readAsString: async (fileUri: string, options?: FileSystem.ReadingOptions): Promise<string> => {
    return await FileSystem.readAsStringAsync(fileUri, options);
  },

  /**
   * Write string to file
   */
  writeAsString: async (
    fileUri: string,
    contents: string,
    options?: FileSystem.WritingOptions
  ): Promise<void> => {
    return await FileSystem.writeAsStringAsync(fileUri, contents, options);
  },

  /**
   * Delete file or directory
   */
  deleteAsync: async (fileUri: string, options?: { idempotent?: boolean }): Promise<void> => {
    return await FileSystem.deleteAsync(fileUri, options);
  },

  /**
   * Move file or directory
   */
  moveAsync: async (options: { from: string; to: string }): Promise<void> => {
    return await FileSystem.moveAsync(options);
  },

  /**
   * Copy file or directory
   */
  copyAsync: async (options: { from: string; to: string }): Promise<void> => {
    return await FileSystem.copyAsync(options);
  },

  /**
   * Create directory
   */
  makeDirectoryAsync: async (
    fileUri: string,
    options?: { intermediates?: boolean }
  ): Promise<void> => {
    return await FileSystem.makeDirectoryAsync(fileUri, options);
  },

  /**
   * Get file/directory info
   */
  getInfoAsync: async (
    fileUri: string,
    options?: { md5?: boolean; size?: boolean }
  ): Promise<FileSystem.FileInfo> => {
    return await FileSystem.getInfoAsync(fileUri, options);
  },

  /**
   * Read directory contents
   */
  readDirectoryAsync: async (fileUri: string): Promise<string[]> => {
    return await FileSystem.readDirectoryAsync(fileUri);
  },

  /**
   * Download file
   */
  downloadAsync: async (
    uri: string,
    fileUri: string,
    options?: FileSystem.DownloadOptions
  ): Promise<FileSystem.FileSystemDownloadResult> => {
    return await FileSystem.downloadAsync(uri, fileUri, options);
  },

  /**
   * Upload file
   */
  uploadAsync: async (
    url: string,
    fileUri: string,
    options?: FileSystem.FileSystemUploadOptions
  ): Promise<FileSystem.FileSystemUploadResult> => {
    return await FileSystem.uploadAsync(url, fileUri, options);
  },
};

/**
 * Network utilities
 * TCP is not supported in React Native - use WebSocket or HTTP instead
 */
export const network = {
  /**
   * Create WebSocket connection (replacement for TCP in most cases)
   */
  createWebSocket: (url: string, protocols?: string | string[]): WebSocket => {
    return new WebSocket(url, protocols);
  },

  /**
   * HTTP fetch with better error handling
   */
  fetch: async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    try {
      const response = await fetch(input, init);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    } catch (error) {
      console.error('Network request failed:', error);
      throw error;
    }
  },
};

/**
 * Migration guide for common patterns
 */
export const migrationGuide = {
  crypto: {
    from: 'react-native-crypto',
    to: 'expo-crypto',
    example: `
      // Old: import crypto from 'react-native-crypto'
      // New: import { crypto } from '@/lib/utils/platform-utils'
      
      // Old: crypto.randomBytes(32, callback)
      // New: const bytes = await crypto.randomBytes(32)
      
      // Old: crypto.createHash('sha256').update(data).digest('hex')
      // New: const hash = await crypto.sha256(data)
    `,
  },
  fs: {
    from: 'react-native-fs',
    to: 'expo-file-system',
    example: `
      // Old: import RNFS from 'react-native-fs'
      // New: import { fs } from '@/lib/utils/platform-utils'
      
      // Old: RNFS.DocumentDirectoryPath
      // New: fs.documentDirectory
      
      // Old: RNFS.readFile(path, 'utf8')
      // New: await fs.readAsString(path)
      
      // Old: RNFS.writeFile(path, content, 'utf8')
      // New: await fs.writeAsString(path, content)
    `,
  },
  tcp: {
    from: 'react-native-tcp',
    to: 'WebSocket or HTTP',
    example: `
      // Old: import TcpSocket from 'react-native-tcp'
      // New: Use WebSocket for real-time communication
      
      // For real-time communication:
      // const ws = network.createWebSocket('ws://localhost:8080')
      
      // For HTTP requests:
      // const response = await network.fetch('http://localhost:8080/api')
    `,
  },
} as const;
