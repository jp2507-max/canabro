/**
 * Resource Cleanup Hook
 * Automatically cleanup resources to prevent memory leaks
 */

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

interface CleanupResource {
  id: string;
  cleanup: () => void;
  type: 'interval' | 'timeout' | 'subscription' | 'listener' | 'animation';
}

export function useResourceCleanup() {
  const resourcesRef = useRef<CleanupResource[]>([]);
  const mountedRef = useRef(true);

  // Register a resource for automatic cleanup
  const registerResource = (resource: CleanupResource) => {
    if (!mountedRef.current) return;
    
    resourcesRef.current.push(resource);
    
    if (__DEV__) {
      console.warn(`🔧 Registered ${resource.type}: ${resource.id}`);
    }
  };

  // Manually cleanup a specific resource
  const cleanupResource = (id: string) => {
    const index = resourcesRef.current.findIndex(r => r.id === id);
    if (index >= 0) {
      const resource = resourcesRef.current[index];
      if (resource) {
        try {
          resource.cleanup();
          resourcesRef.current.splice(index, 1);
          
          if (__DEV__) {
            console.warn(`🧹 Cleaned up ${resource.type}: ${resource.id}`);
          }
        } catch (error) {
          console.error(`Error cleaning up ${resource.type} ${resource.id}:`, error);
        }
      }
    }
  };

  // Cleanup all resources
  const cleanupAllResources = () => {
    const resources = [...resourcesRef.current];
    resourcesRef.current = [];
    
    resources.forEach(resource => {
      try {
        resource.cleanup();
        
        if (__DEV__) {
          console.warn(`🧹 Cleaned up ${resource.type}: ${resource.id}`);
        }
      } catch (error) {
        console.error(`Error cleaning up ${resource.type} ${resource.id}:`, error);
      }
    });
  };

  // Enhanced interval function with auto-cleanup
  const createInterval = (callback: () => void, delay: number, id?: string) => {
    const resourceId = id || `interval-${Date.now()}-${Math.random()}`;
    const intervalId = setInterval(callback, delay);
    
    registerResource({
      id: resourceId,
      cleanup: () => clearInterval(intervalId),
      type: 'interval',
    });
    
    return resourceId;
  };

  // Enhanced timeout function with auto-cleanup
  const createTimeout = (callback: () => void, delay: number, id?: string) => {
    const resourceId = id || `timeout-${Date.now()}-${Math.random()}`;
    const timeoutId = setTimeout(() => {
      callback();
      cleanupResource(resourceId); // Auto-remove after execution
    }, delay);
    
    registerResource({
      id: resourceId,
      cleanup: () => clearTimeout(timeoutId),
      type: 'timeout',
    });
    
    return resourceId;
  };

  // Register subscription with auto-cleanup
  const registerSubscription = (subscription: { remove?: () => void; unsubscribe?: () => void }, id?: string) => {
    const resourceId = id || `subscription-${Date.now()}-${Math.random()}`;
    
    registerResource({
      id: resourceId,
      cleanup: () => {
        subscription.remove?.();
        subscription.unsubscribe?.();
      },
      type: 'subscription',
    });
    
    return resourceId;
  };

  // Register event listener with auto-cleanup
  const registerListener = (
    target: { removeEventListener?: (event: string, listener: unknown) => void },
    event: string,
    listener: unknown,
    id?: string
  ) => {
    const resourceId = id || `listener-${event}-${Date.now()}`;
    
    registerResource({
      id: resourceId,
      cleanup: () => target.removeEventListener?.(event, listener),
      type: 'listener',
    });
    
    return resourceId;
  };

  // Register animation with auto-cleanup
  const registerAnimation = (
    animation: { cancel?: () => void; stop?: () => void },
    id?: string
  ) => {
    const resourceId = id || `animation-${Date.now()}-${Math.random()}`;
    
    registerResource({
      id: resourceId,
      cleanup: () => {
        animation.cancel?.();
        animation.stop?.();
      },
      type: 'animation',
    });
    
    return resourceId;
  };

  // Get resource count for debugging
  const getResourceCount = () => resourcesRef.current.length;

  // Get resources by type
  const getResourcesByType = (type: CleanupResource['type']) => {
    return resourcesRef.current.filter(r => r.type === type);
  };

  // Setup cleanup on component unmount and app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background') {
        // Cleanup non-essential resources when app goes to background
        const nonEssentialTypes: CleanupResource['type'][] = ['interval', 'animation'];
        const resourcesToCleanup = resourcesRef.current.filter(r => 
          nonEssentialTypes.includes(r.type)
        );
        
        resourcesToCleanup.forEach(resource => {
          cleanupResource(resource.id);
        });
        
        if (__DEV__ && resourcesToCleanup.length > 0) {
          console.warn(`🧹 Background cleanup: removed ${resourcesToCleanup.length} non-essential resources`);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
      mountedRef.current = false;
      cleanupAllResources();
    };
  }, []);

  return {
    // Resource registration functions
    createInterval,
    createTimeout,
    registerSubscription,
    registerListener,
    registerAnimation,
    registerResource,
    
    // Cleanup functions
    cleanupResource,
    cleanupAllResources,
    
    // Debugging functions
    getResourceCount,
    getResourcesByType,
  };
}
